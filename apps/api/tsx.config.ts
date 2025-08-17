import { defineConfig } from 'tsx';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// ESM-compatible __dirname resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const PROJECT_ROOT = path.resolve(__dirname);
const MONOREPO_ROOT = path.resolve(__dirname, '../../');

// Normalize and validate environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';
const isTest = NODE_ENV === 'test';

// Load .env variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (!isTest) {
  console.warn('⚠️  .env file not found. Using system environment variables.');
}

// Production safety checks
if (isProduction) {
  const requiredVars = ['ANALYTICS_ID', 'SENTRY_DSN', 'DATABASE_URL'];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`⚠️  Missing critical env vars in production: ${missing.join(', ')}`);
  }
}

// Dev startup log
if (isDevelopment) {
  console.log(`🔍 Running in ${NODE_ENV} mode from: ${PROJECT_ROOT}`);
  console.log(`⚙️  Using tsconfig: ${path.resolve(PROJECT_ROOT, 'tsconfig.json')}`);
}

export default defineConfig({
  cwd: PROJECT_ROOT,
  tsconfig: path.resolve(PROJECT_ROOT, 'tsconfig.json'),
  experimentalLoader: true,

  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.json': 'json',
    '.node': 'copy',
    '.wasm': 'copy',
    '.sql': 'text',
    '.graphql': 'text',
    '.md': 'text'
  },

  alias: {
    '@': path.resolve(PROJECT_ROOT, 'src'),
    '@test': path.resolve(PROJECT_ROOT, 'test'),
    '@assets': path.resolve(PROJECT_ROOT, 'assets'),
    '#root': MONOREPO_ROOT,
    '#types': path.resolve(MONOREPO_ROOT, 'types'),
    '#shared': path.resolve(MONOREPO_ROOT, 'packages/shared'),
    '#utils': path.resolve(MONOREPO_ROOT, 'packages/utils'),
    '#config': path.resolve(PROJECT_ROOT, 'config')
  },

  env: {
    NODE_ENV,
    FORCE_COLOR: '1',
    TSX_DISABLE_CACHE: process.env.CI ? '1' : '0',
    TSX_DISABLE_SOURCE_MAPS: isProduction ? '1' : '0',
    TS_NODE_PROJECT: path.resolve(PROJECT_ROOT, 'tsconfig.json'),
    TSX_CACHE_VERSION: 'v1'
  },

  jsx: 'automatic',
  format: 'esm',
  sourcemap: isDevelopment ? 'inline' : false,

  esbuildOptions: (options, context) => {
    options.target = 'es2022';
    options.define = {
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
      'process.env.BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
      'globalThis.__BUILD_INFO__': JSON.stringify({
        version: process.env.npm_package_version,
        timestamp: new Date().toISOString()
      }),
      ...(isProduction && {
        'process.env.ANALYTICS_ID': JSON.stringify(process.env.ANALYTICS_ID),
        'process.env.SENTRY_DSN': JSON.stringify(process.env.SENTRY_DSN)
      })
    };

    if (isProduction) {
      options.drop = ['console', 'debugger'];
      options.minify = true;
      options.treeShaking = true;
      options.chunkNames = 'chunks/[hash]';
      options.assetNames = 'assets/[hash]';
      options.sourcemap = false;
      options.sourcesContent = false;
      options.legalComments = 'none';
    }

    if (isDevelopment) {
      options.plugins = [{
        name: 'dev-logger',
        setup(build) {
          let start = 0;
          build.onStart(() => {
            start = Date.now();
            console.log('🛠️ Starting dev build...');
          });
          build.onEnd(() => {
            console.log(`⚡ Build finished in ${Date.now() - start}ms`);
          });
        }
      }];
    }

    return options;
  },

  watch: isDevelopment
    ? {
        onRebuild(error, result) {
          if (error) {
            console.error('❌ Rebuild failed:', error.message);
          } else {
            console.log('✅ Rebuild successful');
            if (result?.files.length) {
              const changed = result.files
                .slice(0, 3)
                .map((f) => path.relative(PROJECT_ROOT, f));
              console.log(`   ↳ Changed: ${changed.join(', ')}${result.files.length > 3 ? '...' : ''}`);
            }
          }
        },
        filter: {
          include: [
            'src/**/*',
            'prisma/**/*',
            'config/**/*',
            '../../packages/shared/**/*',
            '../../packages/utils/**/*'
          ],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.git/**',
            '**/.next/**'
          ]
        }
      }
    : false,

  onError: (error) => {
    const msg = error.stack || error.message;
    console.error('❌ TSX Runtime Error:\n', msg);

    if (msg.includes('Cannot find module')) {
      console.log('💡 Tip: Try running `pnpm install` or check your tsconfig paths.');
    }
    if (msg.includes('Unexpected token')) {
      console.log('💡 Tip: Check that you're using the correct file extensions (.ts, .tsx).');
    }
    if (msg.includes('Unknown file extension')) {
      console.log('💡 Tip: Add support in `loader` section.');
    }

    process.exit(1);
  },

  cache: isDevelopment,
  cacheLocation: path.resolve(PROJECT_ROOT, `.tsx-cache-${NODE_ENV}`),
  incremental: true,

  metafile: process.env.ANALYZE_BUNDLE === 'true' && isProduction
});
