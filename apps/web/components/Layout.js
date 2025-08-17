// components/Layout.js
import PropTypes from "prop-types";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { useState } from "react";

export default function Layout({
  children,
  title = "Our Arab Heritage",
  description = "Explore and share Arab cultural treasures",
  locale = "en",
}) {
  const { asPath, locale: currentLocale } = useRouter();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://ourarabheritage.com";
  const canonicalUrl = `${siteUrl}${asPath}`;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const t = {
    siteName: locale === "ar" ? "تراثنا العربي" : "Our Arab Heritage",
    skipLink: locale === "ar" ? "تخطى إلى المحتوى الرئيسي" : "Skip to main content",
    copyright: locale === "ar"
      ? "تراثنا العربي. جميع الحقوق محفوظة"
      : "Our Arab Heritage. All rights reserved",
    privacy: locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy",
    language: locale === "ar" ? "English" : "العربية",
    about: locale === "ar" ? "من نحن" : "About Us",
    menu: locale === "ar" ? "القائمة" : "Menu",
    close: locale === "ar" ? "إغلاق" : "Close",
  };

  const navItems = [
    { href: "/", text: locale === "ar" ? "الرئيسية" : "Home" },
    { href: "/explore", text: locale === "ar" ? "استكشف" : "Explore" },
    { href: "/contribute", text: locale === "ar" ? "مساهمة" : "Contribute" },
    { href: "/about", text: t.about },
  ];

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: t.siteName,
    url: siteUrl,
    description,
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: t.siteName,
      logo: `${siteUrl}/logo.png`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <Head>
        <title>{`${title} | ${t.siteName}`}</title>
        <meta name="description" content={description} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang={locale === "ar" ? "en" : "ar"} href={`${siteUrl}${asPath}`} />

        {locale === "ar" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
              href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600&display=swap"
              rel="stylesheet"
            />
          </>
        )}

        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${title} | ${t.siteName}`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={`${siteUrl}/og-image.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content={locale} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${title} | ${t.siteName}`} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${siteUrl}/og-image.jpg`} />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      </Head>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:px-4 focus:py-2 focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white dark:focus:bg-gray-800 focus:rounded transition-all"
      >
        {t.skipLink}
      </a>

      <div
        className={`min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 ${locale === 'ar' ? 'font-noto-arabic' : ''}`}
        dir={dir}
        lang={locale}
      >
        <nav className="border-b dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-20">
              <Link href="/" className="text-xl font-bold text-ourArabGreen-500 hover:text-ourArabGreen-600 transition-colors">
                {t.siteName}
              </Link>

              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="hidden md:flex items-center space-x-6 rtl:space-x-reverse">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-gray-500 dark:text-gray-400 hover:text-ourArabGreen-500 transition-colors"
                    >
                      {item.text}
                    </Link>
                  ))}
                </div>

                <Link
                  href={asPath}
                  locale={locale === "ar" ? "en" : "ar"}
                  aria-label={`Switch to ${t.language}`}
                  className="text-gray-500 dark:text-gray-400 hover:text-ourArabGreen-500 transition-colors text-sm"
                >
                  {t.language}
                </Link>

                <button
                  className="md:hidden text-gray-500 dark:text-gray-400 hover:text-ourArabGreen-500 focus:outline-none"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label={isMenuOpen ? t.close : t.menu}
                >
                  {isMenuOpen ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {isMenuOpen && (
              <div className="md:hidden pb-4">
                <div className="flex flex-col space-y-2 mt-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-ourArabGreen-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {item.text}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        <main id="main-content" role="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="mt-auto border-t dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} {t.copyright}
            </p>
            <div className="mt-2 flex justify-center gap-6 text-sm">
              <Link href="/privacy" className="text-gray-500 dark:text-gray-400 hover:text-ourArabGreen-500 transition-colors">
                {t.privacy}
              </Link>
              <Link href="/about" className="text-gray-500 dark:text-gray-400 hover:text-ourArabGreen-500 transition-colors">
                {t.about}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  locale: PropTypes.oneOf(["en", "ar"]),
};

