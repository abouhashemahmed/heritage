const crypto = require('crypto');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: process.env.NODE_ENV === 'production',

  generateBuildId: async () => crypto.randomBytes(16).toString('hex'),

  images: {
    domains: [
      'images.ourarabheritage.com',
      'res.cloudinary.com',
      process.env.NODE_ENV === 'development' ? 'via.placeholder.com' : '',
      'js.stripe.com',
    ].filter(Boolean),
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
  },

  async headers() {
    const reportUri = validateReportUri(
      process.env.CSP_REPORT_URI,
      'https://ourarabheritage.report-uri.com/r/d/csp/enforce'
    );

    return [
      {
        source: '/((?!_next/static|_next/image|favicon|assets|api|_next/webpack-hmr|_error|404|500).*)',
        headers: [
          ...securityHeaders,
          {
            key: 'Report-To',
            value: JSON.stringify({
              group: 'csp',
              max_age: 10886400,
              endpoints: [{ url: reportUri }],
              include_subdomains: true,
            }),
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// Helpers
function validateReportUri(uri, fallback) {
  try {
    return uri ? new URL(uri).toString() : fallback;
  } catch {
    return fallback;
  }
}

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()', 'camera=()', 'geolocation=()',
      'gyroscope=()', 'magnetometer=()', 'microphone=()',
      'payment=()', 'usb=()', 'fullscreen=(self)'
    ].join(', ')
  },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

module.exports = nextConfig;
