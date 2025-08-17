// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";
import { BrowserTracing, Replay } from "@sentry/browser";
import { stripUrlQueryAndFragment } from "@sentry/utils";

// 🏷️ Versioning and Environment
const COMMIT_SHA = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev";
const VERSION = process.env.npm_package_version || "0.0.0";
const ENV = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development";

// 🚫 Ignore benign errors
const IGNORE_ERRORS = [
  'ResizeObserver loop limit exceeded',
  'Loading chunk',
  'Hydration failed',
  'Failed to fetch dynamically imported module',
  'NotFoundError: Failed to execute \'removeChild\'',
  'Missing DOM element for prehydration',
];

// 🛡️ Security deny patterns
const SECURITY_DENY_URLS = [
  /extensions\//i,
  /^chrome:\/\//i,
  /safari-extension/i,
  /moz-extension:/i,
  /ms-browser-extension:/i,
  /localhost/i,
  /^webpack-internal:\/\//i,
  /\/_next\/development\/_devPagesManifest.json/i,
];

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  environment: ENV,
  release: `our-arab-heritage@${VERSION}-${COMMIT_SHA}`,
  autoSessionTracking: true,
  attachStacktrace: true,

  // 🎯 Sampling
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACE_RATE || "0.1"),
  profilesSampleRate: ENV === "production" ? 0.05 : 1.0,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.1,

  // 🔌 Integrations
  integrations: [
    new BrowserTracing({
      tracingOrigins: [
        process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.ourarabheritage.com",
        /\.ourarabheritage\.com$/,
      ],
      idleTimeout: 10000,
      startTransactionOnLocationChange: false,
      shouldCreateSpanForRequest: url => !url.includes('/_next/static'),
    }),
    new Replay({
      maskAllText: true,
      blockAllMedia: true,
      networkDetailAllowUrls: [/ourarabheritage\.com/],
      networkCaptureBodies: false,
      unblockSelector: ['.sentry-unmask', '[data-sentry-unblock]'],
      maskTextSelector: '[data-sentry-mask]',
    }),
    new Sentry.Feedback({
      colorScheme: "system",
      buttonLabel: "Report Bug",
      formTitle: "Submit Feedback",
      showEmail: false,
      showName: false,
      isEmailRequired: false,
      formAttributes: {
        screenshot: 'allow',
      },
    }),
  ],

  beforeSend(event) {
    const ignorePaths = ["/privacy", "/auth/(.*)", "/api/health", "/_next/webpack-hmr"];
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (new RegExp(ignorePaths.join("|")).test(path)) return null;
    }

    if (IGNORE_ERRORS.some(msg => event.message?.toLowerCase().includes(msg.toLowerCase()))) {
      return null;
    }

    if (event.request) {
      if (event.request.url) {
        event.request.url = stripUrlQueryAndFragment(event.request.url);
      }
      delete event.request.headers?.Authorization;
      delete event.request.headers?.Cookie;
      delete event.request.headers?.Referer;
      delete event.request.cookies;
      if (event.request.data?.__sentry_scrubbed__ !== true) {
        event.request.data = { __sentry_scrubbed__: true };
      }
    }

    if (event.exception?.values?.[0]?.type === "ChunkLoadError") {
      event.fingerprint = ["chunk-load-error"];
    }

    event.tags = {
      ...event.tags,
      runtime: typeof window !== "undefined" ? "browser" : "unknown",
      commit_sha: COMMIT_SHA,
      env: ENV,
      version: VERSION,
      platform: "web",
      browser: getBrowserMetadata(),
      deployment_region: process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || "unknown",
    };

    return event;
  },

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === "xhr" && breadcrumb.data?.url?.includes("/health")) return null;
    if (breadcrumb.category === "console") return null;
    if (breadcrumb.category === "ui.click") {
      breadcrumb.message = "[Masked Click Action]";
      breadcrumb.data = undefined;
    }
    return breadcrumb;
  },

  denyUrls: SECURITY_DENY_URLS,
  sendDefaultPii: false,

  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",
  consoleBreadcrumbs: false,
  _experiments: {
    captureExceptions: true,
    tracing: true,
    enableInteractions: true,
    enableLongTask: true,
    onStartRouteTransaction: "route",
    enableCaptureFailedRequests: true,
  },
});

// 🌐 Helpers
function getBrowserMetadata() {
  try {
    return navigator?.userAgentData?.brands?.map(b => b.brand).join(", ") ||
           navigator?.userAgent?.split(" ")[0] ||
           "unknown";
  } catch {
    return "unknown";
  }
}

function getDeviceType() {
  try {
    return navigator.maxTouchPoints > 0 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      ? "mobile"
      : "desktop";
  } catch {
    return "unknown";
  }
}

function getLocale() {
  try {
    return navigator.language || navigator.languages?.[0] || "unknown";
  } catch {
    return "unknown";
  }
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "unknown";
  }
}

// 🧑‍💻 Identify user
let isIdentified = false;

export function identifyUser(user) {
  if (!user || isIdentified || ENV === 'test') return;

  Sentry.setUser({
    id: user.id,
    email: user.email?.replace(/(?<=.).(?=.*@)/g, "*"),
    username: user.username || user.email?.split("@")[0] || "anonymous",
    ip_address: undefined,
  });

  Sentry.setContext("user", {
    role: user.role || "guest",
    plan: user.subscriptionTier || "free",
    signupDate: user.createdAt,
    lastActive: new Date().toISOString(),
    deviceType: getDeviceType(),
    sessionId: typeof window?.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
  });

  Sentry.setTags({
    "user.segment": user.segment || "unclassified",
    "user.locale": getLocale(),
    "user.timezone": getTimezone(),
    "user.is_bot": navigator?.webdriver ? "true" : "false",
  });

  isIdentified = true;
}

export function clearUser() {
  Sentry.setUser(null);
  Sentry.setContext("user", {});
  isIdentified = false;
}

// 🎯 Manual custom performance tracing
export function trackCustomTransaction(name, op = "custom") {
  const transaction = Sentry.startTransaction({ name, op });
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
  return transaction;
}
