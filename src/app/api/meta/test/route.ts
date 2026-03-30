import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ID;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  if (!token || !igId || !pageId) {
    return NextResponse.json(
      { error: 'Missing Meta environment variables. Please check META_ACCESS_TOKEN, META_INSTAGRAM_ID, and META_FACEBOOK_PAGE_ID' },
      { status: 400 }
    );
  }

  try {
    const [igResult, fbResult] = await Promise.allSettled([
      fetch(`https://graph.facebook.com/v25.0/${igId}?fields=username,profile_picture_url&access_token=${token}`),
      fetch(`https://graph.facebook.com/v25.0/${pageId}?fields=name,id&access_token=${token}`)
    ]);

    const igData = igResult.status === 'fulfilled' ? await igResult.value.json() : null;
    const fbData = fbResult.status === 'fulfilled' ? await fbResult.value.json() : null;

    // Get token expiry
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`
    );
    const debugData = await debugRes.json();
    const expiresAt = debugData?.data?.expires_at
      ? new Date(debugData.data.expires_at * 1000)
      : null;

    return NextResponse.json({
      instagram: {
        ok: !igData?.error,
        username: igData?.username,
        profilePic: igData?.profile_picture_url,
        error: igData?.error?.message
      },
      facebook: {
        ok: !fbData?.error,
        pageName: fbData?.name,
        pageId: fbData?.id,
        error: fbData?.error?.message
      },
      token: {
        expiresAt,
        daysRemaining: expiresAt
          ? Math.floor((expiresAt.getTime() - Date.now()) / 86400000)
          : null
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
