import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const fileSupabase = createClient(supabaseUrl, supabaseKey);


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
