import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ID;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  if (!token || !igId || !pageId) {
    return NextResponse.json({ 
        success: false, 
        error: 'Missing environment variables. Check Railway settings.' 
    });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
    const data = await res.json();
    
    if (data.data?.is_valid) {
      return NextResponse.json({ 
        success: true, 
        expires_at: data.data.expires_at,
        scopes: data.data.scopes
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: data.error?.message || 'Invalid Token' 
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
