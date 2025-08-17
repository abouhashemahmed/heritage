import { useEffect, useState, useMemo, useCallback } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { Switch } from "@headlessui/react";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";

type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

type TranslationKeys = {
  title: string;
  message: string;
  privacy: string;
  accept: string;
  settings: string;
  decline: string;
  rejectAll: string;
  cancel: string;
  save: string;
  cookieAge: string;
  categories: Record<keyof CookiePreferences, string>;
  description: Record<keyof CookiePreferences, string>;
};

interface CookieConsentProps {
  onConsent?: (prefs: CookiePreferences) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onSave?: (prefs: CookiePreferences) => void;
  onOpenSettings?: () => void;
  onCloseSettings?: () => void;
  locale?: "en" | "ar";
  openSettings: boolean;
  setOpenSettings: (value: boolean) => void;
  privacyPolicyUrl?: string;
}

const COOKIE_KEY = "cookie_consent";
const COOKIE_VERSION = "1.0";
const COOKIE_EXPIRY_DAYS = 365;
const BANNER_DELAY_MS = 1000;

export default function CookieConsent({
  onConsent,
  onAcceptAll,
  onRejectAll,
  onSave,
  onOpenSettings,
  onCloseSettings,
  locale = "en",
  openSettings,
  setOpenSettings,
  privacyPolicyUrl = "/privacy",
}: CookieConsentProps) {
  const [visible, setVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useLockBodyScroll(openSettings);

  useEffect(() => {
    return () => {
      try {
        localStorage.removeItem("cookie_consent_backup");
      } catch {}
    };
  }, []);

  const t = useMemo<TranslationKeys>(() => ({
    en: {
      title: "Cookie Preferences",
      message: "We use cookies to enhance your experience. By continuing, you agree to our",
      privacy: "Privacy Policy",
      accept: "Accept All",
      settings: "Settings",
      decline: "Decline Non-Essential",
      rejectAll: "Reject All",
      cancel: "Cancel",
      save: "Save Settings",
      cookieAge: "Cookies are stored for 12 months",
      categories: {
        necessary: "Necessary",
        analytics: "Analytics",
        marketing: "Marketing",
      },
      description: {
        necessary: "Essential for website functionality",
        analytics: "Helps us improve our services",
        marketing: "Personalized content and ads",
      },
    },
    ar: {
      title: "تفضيلات ملفات الارتباط",
      message: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك. بالاستمرار، أنت توافق على",
      privacy: "سياسة الخصوصية",
      accept: "قبول الكل",
      settings: "الإعدادات",
      decline: "رفض غير الضروري",
      rejectAll: "رفض الكل",
      cancel: "إلغاء",
      save: "حفظ الإعدادات",
      cookieAge: "يتم تخزين ملفات تعريف الارتباط لمدة 12 شهرًا",
      categories: {
        necessary: "ضرورية",
        analytics: "تحليلات",
        marketing: "تسويق",
      },
      description: {
        necessary: "أساسية لوظائف الموقع",
        analytics: "تساعدنا على تحسين خدماتنا",
        marketing: "محتوى وإعلانات مخصصة",
      },
    },
  })[locale], [locale]);

  useEffect(() => {
    const savedConsent = Cookies.get(COOKIE_KEY);
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent) as CookiePreferences & { version?: string };
        if (parsed.version !== COOKIE_VERSION) {
          Cookies.remove(COOKIE_KEY);
          return;
        }
        setPreferences(parsed);
        onConsent?.(parsed);
      } catch {
        Cookies.remove(COOKIE_KEY);
      }
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
      setIsMounted(true);
    }, BANNER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [onConsent]);

  const persistConsent = useCallback((consent: CookiePreferences) => {
    const payload = {
      ...consent,
      version: COOKIE_VERSION,
      timestamp: new Date().toISOString(),
    };

    try {
      Cookies.set(COOKIE_KEY, JSON.stringify(payload), {
        expires: COOKIE_EXPIRY_DAYS,
        sameSite: "Lax",
        secure: typeof window !== "undefined" && window.location.protocol === "https:",
        path: "/",
      });

      localStorage.setItem("cookie_consent_backup", JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist cookie consent:", error);
    }

    onConsent?.(consent);
    setVisible(false);
    setTimeout(() => setIsMounted(false), 500);
    setOpenSettings(false);
  }, [onConsent, setOpenSettings]);

  const handleAcceptAll = () => {
    onAcceptAll?.();
    persistConsent({ necessary: true, analytics: true, marketing: true });
  };

  const handleDecline = () =>
    persistConsent({ necessary: true, analytics: false, marketing: false });

  const handleRejectAll = () => {
    onRejectAll?.();
    persistConsent({ necessary: false, analytics: false, marketing: false });
  };

  const handleSave = useCallback(() => {
    try {
      onSave?.(preferences);
      persistConsent(preferences);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }, [onSave, persistConsent, preferences]);

  const resetToDefaults = () =>
    setPreferences({ necessary: true, analytics: false, marketing: false });

  const categoryKeys = useMemo(
    () => Object.keys(preferences) as (keyof CookiePreferences)[],
    [preferences]
  );

  const renderCategory = useCallback(
    (key: keyof CookiePreferences) => (
      <div key={key} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-none">
        <div className="flex-1">
          <h3 className="font-semibold">{t.categories[key]}</h3>
          <p className="text-sm text-gray-400 mt-1">{t.description[key]}</p>
        </div>
        <Switch
          checked={preferences[key]}
          disabled={key === "necessary"}
          onChange={(checked) => setPreferences((p) => ({ ...p, [key]: checked }))}
          className={`${
            preferences[key] ? "bg-ourArabGreen-500" : "bg-gray-700"
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            key === "necessary" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <span className="sr-only">{t.categories[key]}</span>
          <span
            className={`${
              preferences[key] ? "translate-x-6" : "translate-x-1"
            } inline-block h-4 w-4 transform bg-white rounded-full transition`}
          />
        </Switch>
      </div>
    ),
    [preferences, t]
  );

  if (!isMounted) return null;

  return (
    <>
      {/* Consent Banner */}
      <div
        data-testid="cookie-consent-banner"
        data-version={COOKIE_VERSION}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-heading"
        aria-live="polite"
        className={`fixed bottom-0 inset-x-0 z-50 bg-gray-900 text-white transition-transform duration-500 ease-in-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p id="cookie-consent-heading" className="text-sm flex-1">
            {t.message}{" "}
            {privacyPolicyUrl && (
              <Link
                href={privacyPolicyUrl}
                className="text-ourArabGreen-400 underline hover:text-ourArabGreen-300 focus:outline-none focus:ring-2 focus:ring-ourArabGreen-500"
              >
                {t.privacy}
              </Link>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setOpenSettings(true);
                onOpenSettings?.();
              }}
              className="btn-outline"
              aria-label={t.settings}
            >
              {t.settings}
            </button>
            <button onClick={handleRejectAll} className="btn-outline" aria-label={t.rejectAll}>
              {t.rejectAll}
            </button>
            <button onClick={handleDecline} className="btn-outline" aria-label={t.decline}>
              {t.decline}
            </button>
            <button onClick={handleAcceptAll} className="btn-primary" aria-label={t.accept}>
              {t.accept}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {openSettings && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => {
            setOpenSettings(false);
            onCloseSettings?.();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-settings-title"
            aria-describedby="cookie-settings-description"
            className="bg-gray-900 text-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            <h2 id="cookie-settings-title" className="text-xl font-bold mb-6">
              {t.title}
            </h2>
            <p id="cookie-settings-description" className="sr-only">
              {t.cookieAge}
            </p>

            <div className="divide-y divide-gray-800">
              {categoryKeys.map(renderCategory)}
            </div>

            <p className="text-sm text-gray-400 mt-4">{t.cookieAge}</p>

            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={resetToDefaults}
                className="text-sm text-ourArabGreen-400 hover:underline focus:outline-none focus:ring-2 focus:ring-ourArabGreen-500 rounded"
                aria-label="Reset to default settings"
              >
                Reset Defaults
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOpenSettings(false);
                    onCloseSettings?.();
                  }}
                  className="btn-outline"
                  aria-label={t.cancel}
                >
                  {t.cancel}
                </button>
                <button onClick={handleSave} className="btn-primary" aria-label={t.save}>
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
