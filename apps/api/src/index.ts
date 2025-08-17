// apps/api/src/index.ts

import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";
import compression from "compression";
import helmet from "helmet";
import pinoHttp from "pino-http";
import createError from "http-errors";
import xssClean from "xss-clean";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";

// ✅ Relative imports (only ones that exist)
import { connectWithRetry } from "./utils/database.js";
import logger from "./utils/logger.js";
import { CLOUDINARY_CONFIG, SECURITY_HEADERS } from "./config/index.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";

// ========== Setup ==========
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8080);
const NODE_ENV = process.env.NODE_ENV || "development";

// ========== Env Validation ==========
const REQUIRED_ENV = [
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "DATABASE_URL"
];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) throw new Error(`❌ Missing ${key} in .env`);
});

// ========== Services ==========
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

let redisClient: ReturnType<typeof createClient> | null = null;
if (NODE_ENV === "production" && process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (attempts) => Math.min(attempts * 100, 5000),
      connectTimeout: 5000
    },
    pingInterval: 60000
  });

  redisClient.on("error", (err) => logger.error("Redis client error:", err));
  await redisClient.connect().catch((err) => {
    logger.fatal({ error: err }, "Redis connection failed");
    process.exit(1);
  });
}

// ========== Middleware ==========
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => {
      (req as any).id = randomUUID();
      return (req as any).id;
    }
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        ...SECURITY_HEADERS.csp
      }
    },
    hsts: SECURITY_HEADERS.hsts
  })
);

app.use(xssClean());
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(compression());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// ========== Rate Limiting ==========
const createLimiter = (max: number, prefix: string) =>
  rateLimit({
    store: redisClient
      ? new RedisStore({
          sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
          prefix: `rl:${prefix}:`
        })
      : undefined,
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
    max: Number(process.env[`RATE_LIMIT_${prefix.toUpperCase()}_MAX`] ?? max),
    standardHeaders: true,
    legacyHeaders: false,
    message: createError.TooManyRequests("Too many requests. Try again later.")
  });

const publicLimiter = createLimiter(200, "public");
const strictLimiter = createLimiter(50, "strict");

// ========== Routes ==========
app.get("/", (_req, res) =>
  res.json({
    service: "Our Arab Heritage API",
    status: "operational",
    docs: process.env.API_DOCS_URL,
    uptime: process.uptime()
  })
);

app.get("/health", async (req, res) => {
  try {
    const [db, redis] = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      redisClient?.ping()
    ]);

    res.json({
      requestId: (req as any).id,
      status: db.status === "fulfilled" ? "healthy" : "degraded",
      db: db.status,
      redis: redis?.status === "fulfilled" ? redis.value : "disabled",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    (req as any).log?.error({ error: err }, "Health check failed");
    res.status(503).json({ requestId: (req as any).id, status: "unhealthy" });
  }
});

// ========== Main Routes ==========
app.use("/api/v1/auth", strictLimiter, authRoutes);
app.use("/api/v1/orders", publicLimiter, orderRoutes);
app.use("/api/v1/products", publicLimiter, productRoutes);

// ========== Error Handling ==========
app.use((_req, _res, next) =>
  next(createError.NotFound("Route not found"))
);

app.use((err: any, req: Request & { id?: string; log?: any }, res: Response) => {
  req.log?.error({
    error: err.message,
    stack: NODE_ENV === "development" ? err.stack : undefined,
    requestId: req.id
  });

  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(NODE_ENV === "development" && { stack: err.stack }),
      requestId: req.id
    }
  });
});

// ========== Graceful Shutdown ==========
let server: ReturnType<typeof app.listen>;
const shutdown = async (signal: string) => {
  logger.warn(`${signal} received. Initiating shutdown...`);
  try {
    await Promise.allSettled([
      new Promise((resolve, reject) =>
        server?.close((err) => (err ? reject(err) : resolve(null)))
      ),
      prisma.$disconnect(),
      redisClient?.quit()
    ]);
    logger.info("✅ Services terminated gracefully");
    process.exit(0);
  } catch (err) {
    logger.fatal({ error: err }, "❌ Force quitting");
    process.exit(1);
  }
};

["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, () => shutdown(sig))
);

// ========== Launch ==========
connectWithRetry(prisma)
  .then(() => {
    server = app.listen(PORT, "0.0.0.0", () => {
      logger.info({
        msg: "Production API operational",
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version
      });
    });
  })
  .catch((err) => {
    logger.fatal({ error: err }, "❌ Critical startup failure");
    process.exit(1);
  });

export default app;
