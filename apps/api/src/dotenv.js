// apps/api/src/dotenv.ts
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Constants and Path Resolution
// ─────────────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = process.env.ENV_FILE || 
  `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ''}`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Enhanced Zod Schema with Metadata
// ─────────────────────────────────────────────────────────────────────────────
const EnvSchema = z.object({
  // Core Configuration
  NODE_ENV: z.enum(['development', 'production', 'test'])
    .default('development')
    .describe('Runtime environment'),
  
  PORT: z.string()
    .default('3000')
    .transform(Number)
    .describe('Server port'),

  // Secrets
  DATABASE_URL: z.string()
    .min(1)
    .describe('Database connection URL')
    .brand('secret'),
    
  CLOUDINARY_CLOUD_NAME: z.string()
    .min(1)
    .describe('Cloudinary account identifier'),
    
  CLOUDINARY_API_KEY: z.string()
    .min(1)
    .describe('Cloudinary API access key')
    .brand('secret'),
    
  CLOUDINARY_API_SECRET: z.string()
    .min(64, 'Must be at least 64 characters')
    .describe('Cloudinary API secret')
    .brand('secret'),

  // Optional Configuration
  API_DOMAIN: z.string()
    .default('api.example.com')
    .describe('Base domain for API endpoints'),
    
  APP_NAME: z.string()
    .default('our-arab-heritage')
    .describe('Application namespace'),

  // Infrastructure
  AWS_EXECUTION_ENV: z.string()
    .optional()
    .describe('AWS runtime environment marker'),
    
  // Security
  SECRET_ROTATION_KEY: z.string()
    .regex(/^\d+:.+$/, 'Must be "days:key" format')
    .optional()
    .describe('Automatic rotation key'),
    
  STRICT_MODE: z.string()
    .transform(v => v === 'true')
    .optional()
    .describe('Enable strict validation'),

  // Versioning
  CONFIG_VERSION: z.string()
    .default('1.0')
    .describe('Configuration schema version')
}).describe('Application environment configuration');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Type Augmentation
// ─────────────────────────────────────────────────────────────────────────────
declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof EnvSchema> {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. State Management
// ─────────────────────────────────────────────────────────────────────────────
let envState: z.infer<typeof EnvSchema> | null = null;
let lastHash = '';
const secretMask = (value: string) => value.slice(0, 4) + '...' + value.slice(-4);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Core Loader Implementation
// ─────────────────────────────────────────────────────────────────────────────
export async function loadEnv(options: { force?: boolean } = {}) {
  // Skip if already loaded
  if (envState && !options.force) return envState;

  try {
    const envPath = path.resolve(__dirname, ENV_FILE);
    const raw = await fs.readFile(envPath, 'utf-8');
    const newHash = crypto.createHash('sha1').update(raw).digest('hex');

    // Only proceed if file changed
    if (newHash !== lastHash || options.force) {
      lastHash = newHash;
      
      const envConfig = dotenv.parse(raw);
      const parsed = EnvSchema.parse({
        ...process.env,
        ...envConfig,
        CONFIG_VERSION: envState?.CONFIG_VERSION // Preserve version
      });

      // Apply to process.env
      Object.entries(parsed).forEach(([key, value]) => {
        process.env[key] = value?.toString() || '';
      });

      envState = parsed;
    }

    return envState!;
  } catch (error: any) {
    // Handle missing file
    if (error.code === 'ENOENT') {
      console.warn(`⚠️ Env file not found: ${ENV_FILE}. Using process.env`);
      envState = EnvSchema.parse(process.env);
      return envState;
    }

    // Enhanced Zod errors
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        severity: e.message.includes('Must be') ? 'HIGH' : 'MEDIUM'
      }));

      const errorMessage = [
        'Environment Validation Failed:',
        ...issues.map(i => `[${i.severity}] ${i.path}: ${i.message}`),
        '\nRequired Variables:',
        '- DATABASE_URL',
        '- CLOUDINARY_CLOUD_NAME',
        '- CLOUDINARY_API_KEY',
        '- CLOUDINARY_API_SECRET (64+ chars)'
      ].join('\n');

      throw new Error(errorMessage);
    }

    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Security Validation
// ─────────────────────────────────────────────────────────────────────────────
function validateProductionEnv() {
  if (envState?.NODE_ENV !== 'production') return [];

  const warnings: string[] = [];
  const secrets = [
    'DATABASE_URL',
    'CLOUDINARY_API_SECRET',
    'SECRET_ROTATION_KEY'
  ];

  // Secret strength checks
  secrets.forEach(key => {
    const value = envState?.[key as keyof typeof envState] as string;
    if (!value) {
      warnings.push(`Missing ${key}`);
    } else if (value.length < 64) {
      warnings.push(`${key} too short (${value.length} < 64 chars)`);
    }
  });

  // Rotation status
  if (envState?.SECRET_ROTATION_KEY) {
    const [days] = envState.SECRET_ROTATION_KEY.split(':');
    if (Number(days) > 90) {
      warnings.push('Secrets should be rotated (>90 days old)');
    }
  }

  // Log redacted values
  if (warnings.length > 0) {
    console.info('🔐 Secret Audit:', {
      dbUrl: secretMask(envState?.DATABASE_URL || ''),
      cloudSecret: secretMask(envState?.CLOUDINARY_API_SECRET || '')
    });
  }

  return warnings;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Secret Rotation
// ─────────────────────────────────────────────────────────────────────────────
async function rotateSecrets() {
  if (!envState?.SECRET_ROTATION_KEY) return;

  try {
    const [days, key] = envState.SECRET_ROTATION_KEY.split(':');
    if (Number(days) > 90) {
      console.log('🔄 Initiating secret rotation...');
      // Implementation example:
      // const newSecret = crypto.randomBytes(64).toString('hex');
      // await updateCloudSecret(newSecret);
      // await updateSecretManager(newSecret);
    }
  } catch (error) {
    console.error('Rotation failed:', error instanceof Error ? error.message : error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Public API
// ─────────────────────────────────────────────────────────────────────────────
export const getConfig = () => ({
  version: envState?.CONFIG_VERSION || 'unknown',
  environment: envState?.NODE_ENV || 'unknown',
  apiDomain: envState?.API_DOMAIN,
  strictMode: envState?.STRICT_MODE,
  cloudinary: envState ? {
    cloudName: envState.CLOUDINARY_CLOUD_NAME,
    apiKey: secretMask(envState.CLOUDINARY_API_KEY),
    configured: true
  } : null
});

export const getHealth = () => ({
  lastHash,
  lastLoaded: new Date().toISOString(),
  warnings: validateProductionEnv()
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Initialization
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await loadEnv();
    const warnings = validateProductionEnv();

    console.log([
      `✅ Environment loaded (${envState?.NODE_ENV})`,
      `• Version: ${envState?.CONFIG_VERSION}`,
      `• API: ${envState?.API_DOMAIN}`,
      `• Secrets: ${warnings.length ? 'NEEDS REVIEW' : 'SECURE'}`,
      ...(warnings.length ? ['⚠️ Warnings:', ...warnings] : [])
    ].join('\n'));

    // Periodic checks
    setInterval(async () => {
      await loadEnv();
      await rotateSecrets();
    }, 300_000); // 5 minutes

  } catch (error: any) {
    console.error('❌ Boot Failed:', error.message);
    process.exit(1);
  }
})();