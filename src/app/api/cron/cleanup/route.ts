import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const fileSupabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  // Check auth - this could be a secret key from env
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // For local testing/manual trigger, we'll allow it if there's no secret set for now
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 1. Get Retention Days from Settings
    const { data: settings } = await fileSupabase.from('system_settings').select('retention_days').eq('id', 'global').single();
    const days = settings?.retention_days || 30;

    // 2. Find old posts
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { data: oldPosts, error } = await fileSupabase
      .from('posts')
      .select('id, file_url')
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
    if (!oldPosts || oldPosts.length === 0) return NextResponse.json({ success: true, deleted: 0 });

    // 3. Delete from Storage and DB
    const results = [];
    for (const post of oldPosts) {
      const fileName = post.file_url.split('/').pop();
      if (fileName) {
          // Delete from storage (bucket: 'social-posts')
          await fileSupabase.storage.from('social-posts').remove([fileName]);
      }
      // Delete from DB
      await fileSupabase.from('posts').delete().eq('id', post.id);
      results.push(post.id);
    }

    return NextResponse.json({ success: true, deleted: results.length });

  } catch (err: any) {
    console.error('Cleanup Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
