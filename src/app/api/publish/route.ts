import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import path from 'path';

// Removed unused text-to-svg logic for native sharp text rendering

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const IG_ID = process.env.META_INSTAGRAM_ID;
const FB_PAGE_ID = process.env.META_FACEBOOK_PAGE_ID;
const TOKEN = process.env.META_ACCESS_TOKEN;
const GRAPH_URL = 'https://graph.facebook.com/v25.0';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function pollUntilReady(containerId: string, maxAttempts = 15, intervalMs = 2000): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(intervalMs);
    const res = await fetch(`${GRAPH_URL}/${containerId}?fields=status_code&access_token=${TOKEN}`);
    const data = await res.json();
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error(data.error?.message || 'Instagram processing failed');
  }
  throw new Error('Instagram polling timeout exceeded');
}

async function processImageWithText(imageUrl: string, text: string, fontScale: number = 1.0): Promise<string> {
  try {
    // 1. Download image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 2. Get image dimensions
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1920;

    // 3. Prepare text overlay
    const rectY = Math.floor(height * 0.82); // Lowered for better visual balance
    const textAreaWidth = Math.floor(width * 0.85);

    // Calculate dynamic DPI to ensure it scales precisely with image resolution
    const dynamicDpi = Math.floor((width / 1080) * 400 * fontScale);

    // Render the text using sharp's native text operation (handles RTL/Emoji)
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

    // Generate Background Box with rounded corners
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
          top: rectY - Math.floor(rectPaddingY / 2), 
          left: Math.floor((width - rectWidth) / 2) 
        },
        { 
          input: finalTextLayer, 
          top: rectY, 
          left: Math.floor((width - textW) / 2) 
        }
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    // 4. Upload back to Supabase
    const filename = `processed/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('social-posts')
      .upload(filename, outputBuffer, { contentType: 'image/jpeg' });

    if (error) throw error;
    
    const { data: publicUrlData } = supabase.storage
      .from('social-posts')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Image processing failed, falling back to original:', err);
    return imageUrl;
  }
}

// -------------------------------------------------------------
// INSTAGRAM HANDLERS
// -------------------------------------------------------------
async function igFeed(fileUrl: string, caption: string, type: 'image' | 'video') {
  const body = type === 'image' 
    ? { image_url: fileUrl, caption, access_token: TOKEN }
    : { video_url: fileUrl, media_type: 'REELS', caption, access_token: TOKEN };

  const res = await fetch(`${GRAPH_URL}/${IG_ID}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  await pollUntilReady(data.id, type === 'video' ? 90 : 15, type === 'video' ? 3000 : 2000);

  const pubRes = await fetch(`${GRAPH_URL}/${IG_ID}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: data.id, access_token: TOKEN })
  });
  const pubData = await pubRes.json();
  if (pubData.error) throw new Error(pubData.error.message);
  return pubData.id;
}

async function igStory(fileUrl: string, caption: string, type: 'image' | 'video', fontScale: number = 1.0) {
  const body: any = { 
    media_type: 'STORIES', 
    access_token: TOKEN
  };
  
  let finalUrl = fileUrl;
  if (type === 'image') {
    finalUrl = await processImageWithText(fileUrl, caption, fontScale);
    body.image_url = finalUrl;
  } else {
    body.video_url = fileUrl;
  }

  const res = await fetch(`${GRAPH_URL}/${IG_ID}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  await pollUntilReady(data.id, type === 'video' ? 90 : 15, type === 'video' ? 3000 : 2000);

  const pubRes = await fetch(`${GRAPH_URL}/${IG_ID}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: data.id, access_token: TOKEN })
  });
  const pubData = await pubRes.json();
  if (pubData.error) throw new Error(pubData.error.message);
  return pubData.id;
}

// -------------------------------------------------------------
// FACEBOOK HANDLERS
// -------------------------------------------------------------
async function fbFeed(fileUrl: string, caption: string, type: 'image' | 'video') {
  const endpoint = type === 'image' ? 'photos' : 'videos';
  const payload = type === 'image' 
    ? { url: fileUrl, message: caption, access_token: TOKEN }
    : { file_url: fileUrl, description: caption, access_token: TOKEN };

  const res = await fetch(`${GRAPH_URL}/${FB_PAGE_ID}/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id || data.post_id;
}

async function fbStory(fileUrl: string, caption: string, type: 'image' | 'video') {
  const isImage = type === 'image';
  
  // 1. Upload media as unpublished
  // Note: Facebook Page Stories API currently does not support text stickers or captions directly.
  // We upload with message anyway in case they add support or for internal tracking.
  const upRes = await fetch(`${GRAPH_URL}/${FB_PAGE_ID}/${isImage ? 'photos' : 'videos'}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      [isImage ? 'url' : 'file_url']: fileUrl,
      [isImage ? 'message' : 'description']: caption,
      published: false,
      access_token: TOKEN
    })
  });
  const upData = await upRes.json();
  if (upData.error) throw new Error(upData.error.message);

  // 2. Attach to story
  const stRes = await fetch(`${GRAPH_URL}/${FB_PAGE_ID}/${isImage ? 'photo_stories' : 'video_stories'}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      [isImage ? 'photo_id' : 'video_id']: upData.id,
      access_token: TOKEN
    })
  });
  const stData = await stRes.json();
  if (stData.error) throw new Error(stData.error.message);
  return stData.id;
}

// -------------------------------------------------------------
// MASTER ENDPOINT
// -------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const { fileUrl, fileType, caption, postIndex, targets, operatorName, roomName, fontScale = 1.0 } = await req.json();

    if (!fileUrl || !fileType || !caption) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Capture branch info for history
    const { data: roomData } = await supabase.from('rooms').select('branch').eq('name', roomName).single();

    const { data: post, error: dbError } = await supabase.from('posts').insert({
      file_url: fileUrl,
      file_type: fileType,
      caption: caption,
      post_index: postIndex || 0,
      operator_name: operatorName,
      room_name: roomName,
      branch_name: roomData?.branch || '',
      ig_feed_status: targets.includes('ig_feed') ? 'uploading' : 'skipped',
      ig_story_status: targets.includes('ig_story') ? 'uploading' : 'skipped',
      fb_feed_status: targets.includes('fb_feed') ? 'uploading' : 'skipped',
      fb_story_status: targets.includes('fb_story') ? 'uploading' : 'skipped'
    }).select().single();

    if (dbError) {
      console.error('Database Error:', dbError);
      return NextResponse.json({ error: 'Failed to record post' }, { status: 500 });
    }

    const promises = [];
    if (targets.includes('ig_feed')) promises.push(igFeed(fileUrl, caption, fileType).then(id => ({ t: 'ig_feed', id })).catch(e => ({ t: 'ig_feed', err: String(e) })));
    if (targets.includes('ig_story')) promises.push(igStory(fileUrl, caption, fileType, Number(fontScale)).then(id => ({ t: 'ig_story', id })).catch(e => ({ t: 'ig_story', err: String(e) })));
    if (targets.includes('fb_feed')) promises.push(fbFeed(fileUrl, caption, fileType).then(id => ({ t: 'fb_feed', id })).catch(e => ({ t: 'fb_feed', err: String(e) })));
    if (targets.includes('fb_story')) promises.push(fbStory(fileUrl, caption, fileType).then(id => ({ t: 'fb_story', id })).catch(e => ({ t: 'fb_story', err: String(e) })));

    const rawResults = await Promise.all(promises);
    
    // Process results back into DB
    const updatePayload: any = { error_details: {} };
    rawResults.forEach((r: any) => {
      const isOk = !r.err;
      const t = r.t;
      if (t === 'ig_feed') { updatePayload.ig_feed_status = isOk ? 'published' : 'failed'; updatePayload.ig_feed_media_id = isOk ? r.id : null; }
      if (t === 'ig_story') { updatePayload.ig_story_status = isOk ? 'published' : 'failed'; updatePayload.ig_story_media_id = isOk ? r.id : null; }
      if (t === 'fb_feed') { updatePayload.fb_feed_status = isOk ? 'published' : 'failed'; updatePayload.fb_feed_post_id = isOk ? r.id : null; }
      if (t === 'fb_story') { updatePayload.fb_story_status = isOk ? 'published' : 'failed'; updatePayload.fb_story_media_id = isOk ? r.id : null; }
      
      if (r.err) updatePayload.error_details[t] = r.err;
    });

    await supabase.from('posts').update(updatePayload).eq('id', post.id);

    return NextResponse.json({ success: true, postId: post.id, results: rawResults });

  } catch (err: any) {
    console.error('Publish Endpoint Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
