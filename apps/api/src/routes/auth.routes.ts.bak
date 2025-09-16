import express, { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import createError from "http-errors";
import Joi from "joi";
import { prisma } from "../utils/prisma.js";
import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";
import axios from "axios";
import UAParser from "ua-parser-js";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse
} from "@simplewebauthn/server";

const router = express.Router();

// 🌐 Environment Config
const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
const REFRESH_EXPIRY = process.env.REFRESH_EXPIRY || "7d";
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const RP_NAME = process.env.WEBAUTHN_RP_NAME || "Our Arab Heritage";
const WEBAUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN || `https://${RP_ID}`;

// 🔐 Redis Setup
let redisClient: ReturnType<typeof createClient> | undefined;
try {
  redisClient = createClient({ url: process.env.REDIS_URL });
  await redisClient.connect();
} catch (err) {
  console.warn("⚠️ Redis failed to connect, rate limiting may be disabled.");
}

// 🛡️ Rate Limiting
const rateLimitConfig = {
  store: redisClient
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
        prefix: "authLimit:"
      })
    : undefined,
  standardHeaders: true,
  legacyHeaders: false,
  message: createError.TooManyRequests("Too many attempts")
};

const endpointSpecificLimits = {
  register: rateLimit({ ...rateLimitConfig, windowMs: 864e5, max: 5 }),
  login: rateLimit({ ...rateLimitConfig, windowMs: 360e3, max: 10 }),
  webauthn: rateLimit({ ...rateLimitConfig, windowMs: 180e3, max: 15 })
};

// 🧪 Validation
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      "string.pattern.base": "Password must include upper/lowercase, number & symbol"
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

function validateRequest<T>(schema: Joi.ObjectSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) return next(createError.BadRequest(error.details[0].message));

    req.tokenBinding = {
      ip: req.headers["x-forwarded-for"]?.toString() || req.ip,
      uaHash: crypto.createHash("sha256").update(req.headers["user-agent"] || "").digest("hex"),
      userAgent: new UAParser(req.headers["user-agent"]).getResult()
    };

    next();
  };
}

// 🧾 Logging
async function logSecurityEvent({
  type,
  userId,
  ip,
  uaHash,
  metadata
}: {
  type: string;
  userId?: string;
  ip?: string;
  uaHash?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: { userId, type, ipAddress: ip, userAgentHash: uaHash, metadata }
    });

    if (process.env.SECURITY_ALERT_WEBHOOK) {
      await axios.post(process.env.SECURITY_ALERT_WEBHOOK, {
        text: `🔐 Security Event: ${type} (${userId || "N/A"}) from ${ip}`
      });
    }
  } catch (err) {
    console.warn("Audit log failed:", (err as Error).message);
  }
}

// 🔐 Tokens
function generateTokens(user: { id: string; role: string }, req: Request) {
  const binding = {
    ip: req.tokenBinding.ip,
    uaHash: req.tokenBinding.uaHash,
    exp: Math.floor(Date.now() / 1000) + 86400
  };

  return {
    accessToken: jwt.sign(
      { userId: user.id, role: user.role, binding },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY, algorithm: "HS512" }
    ),
    refreshToken: jwt.sign(
      { userId: user.id, binding },
      REFRESH_SECRET,
      { expiresIn: REFRESH_EXPIRY, algorithm: "HS512" }
    )
  };
}

// 🔄 Refresh
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError.BadRequest("Refresh token required");

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    const isRevoked = await prisma.tokenBlacklist.findUnique({ where: { token: refreshToken } });
    if (isRevoked) throw createError.Unauthorized("Revoked token");

    const uaHash = crypto.createHash("sha256").update(req.headers["user-agent"] || "").digest("hex");
    if (decoded.binding.uaHash !== uaHash) {
      await prisma.tokenBlacklist.create({ data: { token: refreshToken } });
      throw createError.Unauthorized("Session context changed");
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw createError.NotFound("User not found");

    const tokens = generateTokens(user, req);

    await prisma.tokenBlacklist.create({ data: { token: refreshToken, reason: "rotated" } });
    await logSecurityEvent({ type: "TOKEN_REFRESH", userId: user.id, ip: req.ip });

    res.json(tokens);
  } catch (err) {
    await logSecurityEvent({ type: "TOKEN_REFRESH_FAILED", ip: req.ip, metadata: { error: (err as Error).message } });
    next(err);
  }
});

// 👇 Remaining routes like `/register`, `/login`, `/logout`, `/webauthn/options`, and `/webauthn/verify` should be ported next.
// I’ll include them if you’d like to continue here — just say the word.

---

Let me know if you want the full TypeScript version including the `register`, `login`, `logout`, and WebAuthn routes as well, or if you want this one added directly to your project as a `.ts` file. ​:contentReference[oaicite:0]{index=0}​
