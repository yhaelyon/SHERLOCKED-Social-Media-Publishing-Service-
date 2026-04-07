import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: Request) {
  try {
    const { imageUrl, text, fontScale = 1.0 } = await req.json();

    if (!imageUrl || !text) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Download image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 2. Prepare 9:16 Canvas (Instagram Story Standard 1080x1920)
    // Avoid Instagram zooming/resizing by forcing exact standard dimensions
    const width = 1080;
    const height = 1920;

    // Create a blurred background from the original image to fill the 9:16 frame nicely
    const blurredBg = await sharp(inputBuffer)
      .resize(width, height, { fit: 'cover' })
      .blur(40)
      .modulate({ brightness: 0.5 }) // Darken background to make text readable
      .toBuffer();

    // Resize original image preserving aspect ratio to fit inside 9:16
    const foreground = await sharp(inputBuffer)
      .resize(width, height, { fit: 'inside' })
      .toBuffer();

    // Composite them into the new perfect base canvas
    const baseCanvasBuffer = await sharp(blurredBg)
      .composite([{ input: foreground, gravity: 'center' }])
      .toBuffer();

    // 3. Prepare text overlay
    const rectY = Math.floor(height * 0.82);
    const textAreaWidth = Math.floor(width * 0.85);

    // Calculate dynamic DPI to ensure it scales precisely with image resolution
    const dynamicDpi = Math.floor((width / 1080) * 400 * fontScale);

    // Higher DPI and font size for visibility
    const textLayer = await (sharp as any)({
      text: {
        text: `<span foreground="white">${text}</span>`,
        font: 'Assistant, "Noto Color Emoji", "Apple Color Emoji", sans-serif',
        rgba: true,
        width: textAreaWidth,
        align: 'center',
        dpi: dynamicDpi,
      }
    })
    .png()
    .toBuffer();

    const textMeta = await sharp(textLayer).metadata();
    let textW = textMeta.width || 0;
    let textH = textMeta.height || 0;

    // Strict maximum width to prevent overflow out of the frame
    const absoluteMaxWidth = Math.floor(width * 0.90);
    let finalTextLayer = textLayer;
    if (textW > absoluteMaxWidth) {
      const scaleFactor = absoluteMaxWidth / textW;
      finalTextLayer = await sharp(textLayer)
        .resize(absoluteMaxWidth, Math.floor(textH * scaleFactor))
        .toBuffer();
      textW = absoluteMaxWidth;
      textH = Math.floor(textH * scaleFactor);
    }

    const rectPaddingX = Math.floor(width * 0.08);
    const rectPaddingY = Math.floor(height * 0.04);
    
    // Calculate box dimensions, constrained to a maximum of 96% of the screen width
    let rectWidth = textW + rectPaddingX;
    if (rectWidth > width * 0.96) {
       rectWidth = Math.floor(width * 0.96);
    }
    const rectHeight = textH + rectPaddingY;
    const borderRadius = Math.floor(width * 0.045);

    // Generate Background Box
    const bgBox = await sharp({
      create: {
        width: rectWidth,
        height: rectHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.5 }
      }
    })
    .composite([{
      input: Buffer.from(`<svg><rect x="0" y="0" width="${rectWidth}" height="${rectHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="black" /></svg>`),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer();

    const outputBuffer = await sharp(baseCanvasBuffer)
      .composite([
        { 
          input: bgBox, 
          top: rectY - Math.floor(rectPaddingY / 2), 
          left: Math.floor((width - rectWidth) / 2) 
        },
        { 
          input: finalTextLayer, 
          top: rectY, 
          left: Math.floor((width - textW) / 2) 
        }
      ])
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;

    return NextResponse.json({ previewUrl: base64 });
  } catch (err: any) {
    console.error('Preview Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
