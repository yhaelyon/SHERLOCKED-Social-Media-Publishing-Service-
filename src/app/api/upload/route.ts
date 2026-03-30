import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We must bypass RLS for server-side uploads, so we try the service role key first.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov'];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;   // 8MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'לא נבחר קובץ להעלאה.' }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'סוג קובץ לא נתמך. נא להעלות JPG, PNG, WEBP, MP4 או MOV.' }, { status: 400 });
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'תמונה חורגת מהגודל המקסימלי (8MB).' }, { status: 400 });
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: 'וידאו חורג מהגודל המקסימלי (100MB).' }, { status: 400 });
    }

    const fileType = isImage ? 'image' : 'video';
    const ext = file.name.split('.').pop() || 'tmp';
    
    // Generate unique path
    const filename = `posts/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('social-posts')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: `שגיאה בהעלאה לשרת: ${error.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('social-posts')
      .getPublicUrl(data.path);

    return NextResponse.json({
      fileUrl: publicUrlData.publicUrl,
      fileType,
      fileName: file.name,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: 'שגיאת שרת פנימית בעת ההעלאה.' }, { status: 500 });
  }
}
