import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: Request) {
  try {
    const { imageUrl, text } = await req.json();

    if (!imageUrl || !text) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Download image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 2. Get image dimensions
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1920;

    // 3. Prepare text overlay (Matching published logic)
    const rectY = Math.floor(height * 0.82);
    const textAreaWidth = Math.floor(width * 0.85);

    // Higher DPI and font size for visibility
    const textLayer = await (sharp as any)({
      text: {
        text: `<span foreground="white">${text}</span>`,
        font: 'Assistant, "Noto Color Emoji", "Apple Color Emoji", sans-serif',
        rgba: true,
        width: textAreaWidth,
        align: 'center',
        dpi: 400, // Real-world scaling for 1080p
      }
    })
    .png()
    .toBuffer();

    const textMeta = await sharp(textLayer).metadata();
    const textW = textMeta.width || 0;
    const textH = textMeta.height || 0;

    const rectPaddingX = 100;
    const rectPaddingY = 80;
    const rectWidth = textW + rectPaddingX;
    const rectHeight = textH + rectPaddingY;
    const borderRadius = 50;

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

    const outputBuffer = await sharp(inputBuffer)
      .composite([
        { 
          input: bgBox, 
          top: rectY - (rectPaddingY / 2), 
          left: Math.floor((width - rectWidth) / 2) 
        },
        { 
          input: textLayer, 
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
