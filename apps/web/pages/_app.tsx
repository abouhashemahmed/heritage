'use client';

import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import React, {
  useCallback,
  useEffect,
  useState,
  createContext,
  useContext,
  useMemo,
} from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import ErrorBoundary from "@/components/System/ErrorBoundary";
import Head from "next/head";
import Script from "next/script";
import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import { AnimatePresence } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import NProgress from "nprogress";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import Cookies from "js-cookie";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import "@/styles/globals.css";
import "nprogress/nprogress.css";

// === Dynamically load client-only components ===
const ToastNotifications = dynamic(() => import("@/components/ToastNotifications"), {
  ssr: false,
});
const CookieConsentBanner = dynamic(() => import("@/components/CookieConsent"), {
  ssr: false,
});
const SafeMotionMain = dynamic(() => import("@/components/System/SafeMotionMain"), {
  ssr: false,
});

// === Global declaration for analytics ===
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: Record<string, any>[];
  }
}

// === Theme context ===
const ThemeStateContext = createContext<boolean>(false);
const ThemeDispatchContext = createContext<() => void>(() => {});
export const useThemeState = () => useContext(ThemeStateContext);
export const useThemeDispatch = () => useContext(ThemeDispatchContext);

// === Theme Toggle Button ===
const ThemeButton = React.memo(
  ({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) => (
    <button
      className="fixed bottom-4 right-4 p-3 rounded-full bg-ourArabGreen-500 text-white shadow-lg hover:bg-ourArabGreen-600 transition-colors"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  )
);

// === Theme Hook ===
const useTheme = () => {
  const [isDark, setIsDark] = useState(false);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    document.documentElement.style.colorScheme = newTheme;
    localStorage.setItem("theme", newTheme);
    Cookies.set("theme", newTheme, {
      expires: 365,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    });
    setIsDark(!isDark);
  }, [isDark]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cookieTheme = Cookies.get("theme");
    const savedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme = cookieTheme || savedTheme || systemTheme;

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    setIsDark(theme === "dark");
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!Cookies.get("theme") && !localStorage.getItem("theme")) {
        document.documentElement.classList.toggle("dark", e.matches);
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return { isDark, toggleTheme, prefersReducedMotion };
};

// === App Component ===
export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const { isDark, toggleTheme, prefersReducedMotion } = useTheme();
  const nonce = (pageProps as any)?.nonce || "";
  const [mounted, setMounted] = useState(false);

  const getLayout = useMemo(
    () => (Component as any).getLayout || ((page: React.ReactNode) => <Layout>{page}</Layout>),
    [Component]
  );

  useEffect(() => {
    setMounted(true);

    const start = () => {
      NProgress.start();
      setIsLoading(true);
    };

    const complete = (url: string) => {
      NProgress.done();
      setIsLoading(false);

      if (consentGiven && process.env['NEXT_PUBLIC_GA_ID']) {
        window.gtag?.("config", process.env['NEXT_PUBLIC_GA_ID'], {
          page_path: url,
          theme: isDark ? "dark" : "light",
          transport_type: "beacon",
        });
      }
    };

    const handleError = (err: Error) => {
      NProgress.done();
      setIsLoading(false);
      setError(err);
      Sentry.captureException(err);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", complete);
    router.events.on("routeChangeError", handleError);

    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", complete);
      router.events.off("routeChangeError", handleError);
    };
  }, [router, consentGiven, isDark]);

  useEffect(() => {
    if (consentGiven && process.env['NEXT_PUBLIC_GA_ID']) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", process.env['NEXT_PUBLIC_GA_ID']);
    }
  }, [consentGiven]);

  return (
    <ErrorBoundary error={error} onReset={() => setError(null)} FallbackComponent={ErrorFallback}>
      <ThemeStateContext.Provider value={isDark}>
        <ThemeDispatchContext.Provider value={toggleTheme}>
          <AuthProvider>
            <CartProvider>
              <Head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content={isDark ? "#1A1A1A" : "#3FA66A"} />
              </Head>

              {process.env['NEXT_PUBLIC_GA_ID'] && consentGiven && (
                <Script
                  id="gtag"
                  strategy="afterInteractive"
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env['NEXT_PUBLIC_GA_ID']}`}
                  nonce={nonce}
                />
              )}

              <CookieConsentBanner
                onConsent={() => {
                  Cookies.set("cookie_consent", "true", {
                    expires: 365,
                    sameSite: "Lax",
                    secure: process.env.NODE_ENV === "production",
                  });
                  setConsentGiven(true);
                }}
                openSettings={false}
                setOpenSettings={() => {}}
              />

              <div id="skip-nav">
                <a href="#main-content" className="sr-only focus:not-sr-only">
                  Skip to content
                </a>
              </div>

              {mounted && <ThemeButton isDark={isDark} toggleTheme={toggleTheme} />}

              <AnimatePresence mode={prefersReducedMotion ? "wait" : "sync"} initial={false}>
                {mounted && (
                  <SafeMotionMain motionKey={router.asPath}>
                    {getLayout(<Component {...pageProps} />)}
                  </SafeMotionMain>
                )}
              </AnimatePresence>

              <ToastNotifications />
            </CartProvider>
          </AuthProvider>
        </ThemeDispatchContext.Provider>
      </ThemeStateContext.Provider>
    </ErrorBoundary>
  );
}

const ErrorFallback = ({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) => (
  <div role="alert" className="p-8 text-red-600 bg-red-50">
    <h2 className="text-2xl font-bold">Something went wrong:</h2>
    <pre className="mt-4 whitespace-pre-wrap">{error.message}</pre>
    <button
      onClick={resetError}
      className="px-4 py-2 mt-4 text-white bg-red-600 rounded hover:bg-red-700"
    >
      Try Again
    </button>
  </div>
);
