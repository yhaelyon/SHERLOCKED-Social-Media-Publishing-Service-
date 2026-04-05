import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ID;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  let igData = null;
  let fbData = null;
  let expiresAtStr = 'Expired';
  let expiresDays = 0;

  try {
    const [igResult, fbResult] = await Promise.allSettled([
      fetch(`https://graph.facebook.com/v25.0/${igId}?fields=username,profile_picture_url&access_token=${token}`),
      fetch(`https://graph.facebook.com/v25.0/${pageId}?fields=name,id&access_token=${token}`)
    ]);

    igData = igResult.status === 'fulfilled' ? await igResult.value.json() : null;
    fbData = fbResult.status === 'fulfilled' ? await fbResult.value.json() : null;

    if (token) {
      const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
      const debugData = await debugRes.json();
      const isNeverExpiring = debugData?.data?.expires_at === 0;
      if (isNeverExpiring) {
          expiresAtStr = 'Never';
          expiresDays = 9999;
      } else {
          const expiresAt = debugData?.data?.expires_at ? new Date(debugData.data.expires_at * 1000) : null;
          if (expiresAt) {
              expiresAtStr = expiresAt.toLocaleDateString();
              expiresDays = Math.floor((expiresAt.getTime() - Date.now()) / 86400000);
          }
      }
    }
  } catch (err) {}

  const { count: totalPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: thisWeekPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString());
  const { data: counter } = await supabase.from('post_counter').select('total_count').single();

  return NextResponse.json({
    ig: igData,
    fb: fbData,
    ig_id: igId,
    fb_id: pageId,
    expires_at: expiresAtStr,
    expires_days: expiresDays,
    stats: {
        total: totalPosts || 0,
        week: thisWeekPosts || 0,
        counter: counter?.total_count || 0
    }
  });
}
