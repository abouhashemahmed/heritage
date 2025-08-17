import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const nonce = ctx.req?.headers?.get?.('x-csp-nonce') || '';
    const initialTheme = ctx.req?.cookies?.theme || 'light';
    const locale = ctx.locale || 'en';

    // ✅ Validate nonce in production
    if (process.env.NODE_ENV === 'production') {
      const noncePattern = /^[a-zA-Z0-9_-]{20,}$/;
      if (!noncePattern.test(nonce)) {
        console.warn('⚠️ Falling back to minimal CSP due to nonce failure');
        ctx.res?.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; report-uri https://your-report-uri.com"
        );
        throw new Error('CSP validation failed - invalid nonce');
      }
    }

    return { ...initialProps, nonce, initialTheme, locale };
  }

  render() {
    const { nonce, initialTheme, locale } = this.props;

    return (
      <Html
        lang={locale}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        className={initialTheme}
        data-color-mode={initialTheme}
      >
        <Head nonce={nonce}>
          <meta charSet="utf-8" />
          <meta name="theme-color" content="#3FA66A" />
          <meta name="description" content="Our Arab Heritage – Discover and support authentic Arab creators." />
          <meta name="color-scheme" content="light dark" />

          {/* 🔵 Fonts & Performance */}
          <link rel="preconnect" href="https://fonts.googleapis.com" nonce={nonce} referrerPolicy="no-referrer" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" nonce={nonce} referrerPolicy="no-referrer" />
          <link
            rel="preload"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
            as="style"
            nonce={nonce}
            referrerPolicy="no-referrer"
          />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
            nonce={nonce}
            integrity="sha384-svBAqD4Vz45Q68wqCyyGMvX8idNxcJ66AFD3MQBxw9bcQ4jAzeEr8lgFiygi5hmI"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />

          {/* 🟢 Optional Arabic font preload */}
          <link
            rel="preload"
            href="/fonts/ArabicFont.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
            nonce={nonce}
          />

          {/* 🟢 Favicon with nonce */}
          <link rel="icon" href="/favicon.ico" nonce={nonce} />

          {/* 🔐 CSP Nonce & Monitoring */}
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                window.__nonce__ = '${nonce}';
                window.__CSP_REPORT_URI__ = '${process.env.CSP_REPORT_URI || ''}';

                window.onerror = function(msg, url, line) {
                  if (window.__CSP_REPORT_URI__) {
                    fetch(window.__CSP_REPORT_URI__, {
                      method: 'POST',
                      body: JSON.stringify({
                        error: { message: msg, url: url, line: line },
                        timestamp: new Date().toISOString()
                      }),
                      headers: { 'Content-Type': 'application/json' }
                    });
                  }
                };
              `,
            }}
          />

          {/* 🧪 Optional: Performance beacon */}
          {process.env.NEXT_PUBLIC_PERF_KEY && (
            <script
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `
                  if (!window.__perfSetup) {
                    window.__perfSetup = true;
                    window.addEventListener('load', () => {
                      const t = performance.timing;
                      const metrics = {
                        dns: t.domainLookupEnd - t.domainLookupStart,
                        tcp: t.connectEnd - t.connectStart,
                        ttfb: t.responseStart - t.requestStart,
                        domLoaded: t.domContentLoadedEventEnd - t.navigationStart,
                        pageLoaded: t.loadEventEnd - t.navigationStart
                      };
                      ${
                        process.env.NODE_ENV === 'production'
                          ? `navigator.sendBeacon('${process.env.NEXT_PUBLIC_PERF_KEY}', JSON.stringify(metrics));`
                          : `console.debug('Perf Metrics:', metrics);`
                      }
                    });
                  }
                `,
              }}
            />
          )}
        </Head>

        <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
