// middleware.js (Relaxed for development)
import { NextResponse } from 'next/server';

export function middleware() {
  const response = NextResponse.next();

  // 🚧 TEMPORARILY relaxed CSP for debugging only
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;
    style-src 'self' 'unsafe-inline';
    img-src * data: blob:;
    connect-src *;
    font-src 'self' data:;
    frame-src *;
    object-src 'none';
    base-uri 'self';
  `.replace(/\s+/g, ' ').trim();

  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)'],
};
