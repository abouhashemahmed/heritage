// middleware.js
import { NextResponse } from 'next/server';

// ✅ Edge-compatible nonce generator
function generateNonce() {
  const array = new Uint8Array(16);
  globalThis.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function middleware(request) {
  try {
    const nonce = generateNonce();
    const response = NextResponse.next();

    // 🔒 Strict CSP
    const csp = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com;
      style-src 'self' 'nonce-${nonce}';
      img-src 'self' data: blob:
        https://res.cloudinary.com 
        https://images.ourarabheritage.com 
        https://via.placeholder.com;
      font-src 'self' data:;
      connect-src 'self' 
        ${process.env.CSP_REPORT_URI || 'https://ourarabheritage.report-uri.com'};
      frame-src 'self' https://js.stripe.com;
      object-src 'none';
      base-uri 'self';
      report-to csp;
      report-uri ${process.env.CSP_REPORT_URI || 'https://ourarabheritage.report-uri.com'};
    `.replace(/\s+/g, ' ').trim();

    // 🔐 Headers
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('x-nonce', nonce);
    response.headers.set('Report-To', JSON.stringify({
      group: 'csp',
      max_age: 10886400,
      endpoints: [{
        url: process.env.CSP_REPORT_URI || 'https://ourarabheritage.report-uri.com'
      }],
      include_subdomains: true
    }));

    return response;
  } catch (error) {
    console.error('❌ CSP Middleware Error:', error);
    return new NextResponse(null, {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self';",
        'x-middleware-error': 'csp_failure',
      },
    });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)'],
};

// middleware.js
import { NextResponse } from 'next/server';

// ✅ Edge-compatible nonce generator
function generateNonce() {
  const array = new Uint8Array(16);
  globalThis.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function middleware(request) {
  try {
    const nonce = generateNonce();
    const response = NextResponse.next();

    // 🔒 Strict CSP
    const csp = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com;
      style-src 'self' 'nonce-${nonce}';
      img-src 'self' data: blob:
        https://res.cloudinary.com 
        https://images.ourarabheritage.com 
        https://via.placeholder.com;
      font-src 'self' data:;
      connect-src 'self' 
        ${process.env.CSP_REPORT_URI || 'https://ourarabheritage.report-uri.com'};
      frame-src 'self' https://js.stripe.com;
      object-src 'none';
      base-uri 'self';
      report-to csp;
      report-uri ${process.env.CSP_REPORT_URI || 'https://ourarabheritage.report-uri.com'};
    `.replace(/\s+/g, ' ').trim();

    // 🔐 Headers
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('x-nonce', nonce);
    response.headers.set('Report-To', JSON.stringify({
      group: 'csp',
      max_age: 10886400,
      endpoints: [{
        url: process.env.CSP_REPORT_URI || 'https://ourarabheritage.report-uri.com'
      }],
      include_subdomains: true
    }));

    return response;
  } catch (error) {
    console.error('❌ CSP Middleware Error:', error);
    return new NextResponse(null, {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self';",
        'x-middleware-error': 'csp_failure',
      },
    });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)'],
};
