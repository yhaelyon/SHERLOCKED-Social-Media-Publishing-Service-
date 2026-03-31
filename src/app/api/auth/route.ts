import { NextResponse } from 'next/server';

const ACCOUNTS = {
  admin: { username: 'admin', password: 'sherlocked1506', role: 'manager' },
  sherlocked: { username: 'sherlocked', password: 'altalena14', role: 'operator' }
};

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const account = Object.values(ACCOUNTS).find(
      (a) => a.username === username && a.password === password
    );

    if (!account) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const session = {
      username: account.username,
      role: account.role,
      at: Date.now()
    };

    const response = NextResponse.json({ success: true, role: account.role });
    
    // Set cookie for 7 days
    response.cookies.set('auth_session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { origin } = new URL(req.url);
  const response = NextResponse.redirect(new URL('/login', origin));
  response.cookies.delete('auth_session');
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_session');
  return response;
}
