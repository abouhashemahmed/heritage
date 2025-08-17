// sentry.server.config.js
import * as Sentry from "@sentry/nextjs";
import { RewriteFrames, LinkedErrors } from "@sentry/integrations";

// ✅ Validate DSN format
const validateDSN = (dsn) => {
  const pattern = /^https:\/\/(\w+)@([\w.-]+)\/(\d+)$/;
  if (!pattern.test(dsn)) {
    throw new Error("Invalid DSN format: expected https://<key>@<host>/<project_id>");
  }
  return dsn.match(pattern).slice(1); // [key, host, projectId]
};

try {
  // 🌍 Runtime Context
  const COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev";
  const APP_VERSION = process.env.npm_package_version || "0.0.0";
  const ENV = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development";
  const DSN = process.env.SENTRY_DSN || "";

  // 🔒 Fail early in production without DSN
  if (ENV !== "development") {
    if (!DSN) throw new Error("❌ SENTRY_DSN required in non-development environments");
    const [key, host, projectId] = validateDSN(DSN);
    console.log(`✅ Sentry initialized for project ${projectId} on ${host}`);
  }

  // 🚀 Initialize Sentry
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: `our-arab-heritage@${APP_VERSION}-${COMMIT_SHA}`,

    // 🔄 Queue / Retry
    transportOptions: {
      queue: {
        maxQueueSize: 100,
        flushTimeout: 5000,
        maxAge: 300000, // 5 min
      },
      retry: {
        maxRetries: 3,
        backoff: true,
      },
    },

    // 🔌 Integrations
    integrations: [
      new RewriteFrames({
        root: process.env.SENTRY_ROOT_DIR || process.cwd(),
        prefix: "app:///",
      }),
      new LinkedErrors({
        key: "cause",
        limit: 5,
        denyUrls: [/node_modules/],
      }),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ requestHandler: true, router: true }),
      new Sentry.Integrations.Session({
        stickySession: true,
        heartbeatInterval: 60_000,
      }),
    ],

    // 🧪 Experimental
    _experiments: {
      captureServerComponentError: true,
      enableInteractions: true,
      tracing: true,
      metrics: ENV === "production",
    },

    // 🔐 Security
    sendDefaultPii: false,
    normalizeHttpHeaders: true,

    // 🔍 Production-Only Performance Config
    ...(ENV === "production" && {
      tracesSampler: (ctx) =>
        ctx.request?.url?.includes("/api") ? 0.2 : 0.1,
      profilesSampleRate: 0.05,
      attachStacktrace: false,
    }),

    // 📎 Add context to errors
    beforeSend(event) {
      if (event.request?.url?.includes("/api/health")) return null;

      event.tags = {
        ...event.tags,
        runtime: process.env.NEXT_RUNTIME || "nodejs",
        region: process.env.VERCEL_REGION || "local",
        commit_sha: COMMIT_SHA,
        deployment_type: process.env.VERCEL_ENV || "local",
      };

      // Sanitize sensitive headers
      if (event.request?.headers?.authorization) {
        delete event.request.headers.authorization;
      }

      return event;
    },

    denyUrls: [
      /extensions?\//i,
      /^chrome:\/\//i,
      /safari-extension/i,
      /(localhost|127\.0\.0\.1|::1|\[::1\])/,
    ],

    normalizeDepth: 5,
    maxBreadcrumbs: 50,
    debug: process.env.SENTRY_DEBUG === "true",

    _metadata: {
      sdk: {
        name: "sentry.javascript.nextjs",
        version: "7.66.0",
      },
    },
  });

} catch (error) {
  console.error("🚨 Sentry init failed:", error.message);
  if (process.env.NODE_ENV === "production") process.exit(1);
}
