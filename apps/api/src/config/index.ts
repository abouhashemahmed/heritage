// apps/api/src/config/index.ts
import { config } from "dotenv";
import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import type { SecurityHeaders } from "@/types"; // make sure this alias works

// 1. Environment Setup --------------------------------------------------------
config({ path: process.env.ENV_FILE || ".env" });

// 2. Type Augmentation -------------------------------------------------------
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CLOUDINARY_CLOUD_NAME: string;
      CLOUDINARY_API_KEY: string;
      CLOUDINARY_API_SECRET: string;
      DATABASE_URL: string;
      API_DOMAIN?: string;
      NODE_ENV?: "development" | "production" | "test";
      AWS_EXECUTION_ENV?: string;
      APP_NAME?: string;
    }
  }
}

// 3. Utility Functions -------------------------------------------------------
const hash = (code: string) => {
  const sha = createHash("sha256").update(code).digest("base64");
  return `'sha256-${sha}'`;
};

const validateProductionSecret = (secret: string | undefined, name: string) => {
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    console.warn(`⚠️ ${name} seems too short for production use`);
  }
};

// 4. Cloudinary Config -------------------------------------------------------
export const CLOUDINARY_CONFIG = Object.freeze((() => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  validateProductionSecret(CLOUDINARY_API_SECRET, "CLOUDINARY_API_SECRET");

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Missing Cloudinary environment variables");
  }

  return {
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  };
})());

// 5. Security Headers --------------------------------------------------------
export const SECURITY_HEADERS: SecurityHeaders = Object.freeze({
  csp: Object.freeze({
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      // Replace this hash if you use a known inline script
      hash("console.log('CSP-compatible inline script')"),
      (req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`,
      "https://cdn.jsdelivr.net",
    ],
    imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
    connectSrc: [
      "'self'",
      `https://${process.env.API_DOMAIN || "api.example.com"}`,
      "https://api.cloudinary.com",
    ],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    reportUri: "/csp-violation-report",
    upgradeInsecureRequests: process.env.NODE_ENV === "production",
  }),
  hsts: Object.freeze({
    maxAge: process.env.NODE_ENV === "production" ? 31536000 : 300,
    includeSubDomains: true,
    preload: process.env.NODE_ENV === "production",
  }),
  featurePolicy: Object.freeze({
    accelerometer: "'none'",
    camera: "'none'",
    geolocation: "'none'",
    microphone: "'none'",
    payment: "'none'",
    usb: "'none'",
  }),
});

// 6. Config Validation -------------------------------------------------------
export async function validateConfig() {
  const requiredVars = [
    "DATABASE_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required env vars: ${missingVars.join(", ")}`);
  }

  if (process.env.AWS_EXECUTION_ENV) {
    try {
      const { SSM } = await import("@aws-sdk/client-ssm");
      const ssm = new SSM();
      const { Parameters } = await ssm.getParameters({
        Names: requiredVars.map((v) => `/${process.env.APP_NAME}/${v}`),
        WithDecryption: true,
      });
      Parameters?.forEach((param) => {
        process.env[param.Name!.split("/").pop()!] = param.Value!;
      });
    } catch (error) {
      console.error("Failed to load AWS secrets:", error);
    }
  }
}

// 7. Versioning & Metadata ---------------------------------------------------
export const CONFIG_VERSION = "1.1";
export const CONFIG_SCHEMA = Object.freeze({
  cloudinary: ["cloud_name", "api_key", "api_secret"],
  security: ["csp", "hsts", "featurePolicy"],
});
