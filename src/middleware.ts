import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authSession = request.cookies.get('auth_session')?.value;

  // Paths that are always allowed
  if (pathname === '/login' || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // If not logged in, redirect to /login
  if (!authSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const session = JSON.parse(authSession);
    const role = session.role;

    // Manager can access everything
    if (role === 'manager') {
      return NextResponse.next();
    }

    // Operator can only access /upload, /history, and home (which redirects to /upload)
    const operatorAllowedPaths = ['/upload', '/history', '/', '/api/upload', '/api/history', '/api/publish', '/api/caption'];
    
    // Check if the current path is allowed for operators
    const isAllowed = operatorAllowedPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

    if (role === 'operator' && !isAllowed) {
      // Redirect operator away from admin areas back to upload
      return NextResponse.redirect(new URL('/upload', request.url));
    }

    return NextResponse.next();
  } catch (e) {
    // If cookie is invalid, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
