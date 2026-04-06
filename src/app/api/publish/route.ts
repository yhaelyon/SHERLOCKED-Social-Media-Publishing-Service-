import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

async function igStory(fileUrl: string, caption: string, type: 'image' | 'video') {
  const stickers = [
    {
      sticker_type: 'TEXT',
      x: 0.5,
      y: 0.85, // Position near the bottom
      text: caption,
      font_size: 0.08,
      text_color: '#ffffff'
    }
  ];

  const body: any = { 
    media_type: 'STORIES', 
    access_token: TOKEN,
    stickers: JSON.stringify(stickers)
  };
  
  if (type === 'image') body.image_url = fileUrl;
  else body.video_url = fileUrl;

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
    const { fileUrl, fileType, caption, postIndex, targets, operatorName, roomName } = await req.json();

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
    if (targets.includes('ig_story')) promises.push(igStory(fileUrl, caption, fileType).then(id => ({ t: 'ig_story', id })).catch(e => ({ t: 'ig_story', err: String(e) })));
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
