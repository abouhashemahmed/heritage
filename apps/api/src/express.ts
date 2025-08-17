import express, { Express, Request, Response, NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from './cors.js';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { loadEnv } from './dotenv.js';
import { getConfig } from './config.js';
import { createTerminus } from '@godaddy/terminus';
import http from 'node:http';
import { logger } from './logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load Environment
// ─────────────────────────────────────────────────────────────────────────────
await loadEnv();
const config = getConfig();

// ─────────────────────────────────────────────────────────────────────────────
// 2. App Initialization
// ─────────────────────────────────────────────────────────────────────────────
const app: Express = express();

// ─────────────────────────────────────────────────────────────────────────────
// 3. Security Headers (Helmet + CSP)
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", `https://${config.apiDomain}`],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://*.cloudinary.com'],
      connectSrc: ["'self'", `https://${config.apiDomain}`],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// 4. Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`⏳ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});
app.use(apiLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Compression
// ─────────────────────────────────────────────────────────────────────────────
app.use(compression({
  threshold: 1024,
  filter: (req) => {
    if (req.headers['x-no-compression']) return false;
    return /json|text|javascript|css/.test(String(req.headers['content-type']));
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// 6. Body Parsing
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch {
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10kb', parameterLimit: 10 }));

// ─────────────────────────────────────────────────────────────────────────────
// 7. Cookie & CORS
// ─────────────────────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(cors);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Logging
// ─────────────────────────────────────────────────────────────────────────────
const morganFormat = config.environment === 'production'
  ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms'
  : 'dev';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.http(message.trim())
  },
  skip: (req) => req.path === '/health'
}));

// ─────────────────────────────────────────────────────────────────────────────
// 9. Health Check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: config.environment,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. 404 Handler
// ─────────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = config.environment === 'production' && status === 500
    ? 'Internal Server Error'
    : err.message;

  logger.error(`❌ Error: ${message}`, {
    url: req.originalUrl,
    status,
    stack: config.environment === 'development' ? err.stack : undefined
  });

  res.status(status).json({ error: message });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Server Initialization + Graceful Shutdown
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(app);

createTerminus(server, {
  signals: ['SIGINT', 'SIGTERM'],
  timeout: 5000,
  healthChecks: { '/health': () => Promise.resolve() },
  onSignal: async () => {
    logger.info('🧹 Cleanup started...');
    // Place DB disconnections or queues here
  },
  onShutdown: async () => {
    logger.info('✅ Cleanup finished. Server shutting down.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Export
// ─────────────────────────────────────────────────────────────────────────────
export { app, server };
