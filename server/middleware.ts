/**
 * Middleware — محافظت از مسیرهای سرویس‌دهی (حالت Full-Stack)
 * مسیرهای عمومی (ورود، ثبت‌نام، فایل‌های ثابت و APIهای عمومی) آزاد هستند؛
 * بقیه نیازمند نشست معتبرند و در غیر این صورت به /login هدایت می‌شوند.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/manifest.json', '/sw.js', '/icons'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/holidays'
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // همه مسیرها به‌جز فایل‌های ثابت
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
