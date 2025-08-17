import { z } from 'zod';

// 1. Schema for all required env vars (validate on startup)
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().optional(),
  API_DOCS_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(8080),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_PUBLIC_MAX: z.coerce.number().default(200),
  RATE_LIMIT_STRICT_MAX: z.coerce.number().default(50),
});

const env = EnvSchema.parse(process.env);

// 2. Security headers (HSTS, CSP, Permissions Policy)
export const SECURITY_HEADERS = {
  csp: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Consider removing for strict prod setups
      'https://*.cloudinary.com',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'https://res.cloudinary.com',
      'https://*.google-analytics.com',
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://*.google-analytics.com',
      'https://*.cloudinary.com',
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  },
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: '()',
    microphone: '()',
    geolocation: '()',
    fullscreen: '()',
  },
} as const;

// 3. Cloudinary config (type-safe)
export const CLOUDINARY_CONFIG = {
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
  cdn_subdomain: true,
  private_cdn: env.NODE_ENV === 'production',
} satisfies {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  secure: boolean;
  cdn_subdomain?: boolean;
  private_cdn?: boolean;
};

// 4. Runtime config assertion
export function assertValidConfig() {
  try {
    EnvSchema.parse(process.env);
  } catch (error) {
    throw new Error(`❌ Invalid environment config: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`);
  }
}

// 5. Exports
export { env };
export type SecurityHeadersConfig = typeof SECURITY_HEADERS;
export type CloudinaryConfig = typeof CLOUDINARY_CONFIG;
