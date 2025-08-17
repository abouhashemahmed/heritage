// components/system/ErrorBoundary.js
import { Component } from 'react';
import PropTypes from 'prop-types';
import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/router';

class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null,
    errorInfo: null,
    eventId: null,
    componentStack: null,
  };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { router } = this.props;

    const eventId = Sentry.captureException(error, {
      contexts: {
        routing: {
          route: router?.pathname,
          query: router?.query,
          locale: router?.locale,
        },
      },
      extra: { errorInfo, componentStack: errorInfo.componentStack },
      tags: { environment: process.env.NODE_ENV, boundary: 'global' },
    });

    this.setState({
      errorInfo,
      eventId,
      componentStack: errorInfo.componentStack,
    });

    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, eventId: null });

    this.props.onReset?.();

    // Use router soft reset or fallback to reload
    if (this.props.useSoftReset && this.props.router?.replace) {
      this.props.router.replace(this.props.router.asPath);
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReportError = () => {
    const { eventId } = this.state;
    const { locale = 'en' } = this.props;

    if (!eventId || !Sentry.getCurrentHub().getClient()) return;

    const localized = {
      en: {
        title: 'Oops! Please help us fix this',
        subtitle: 'Our team has been notified.',
        subtitle2: 'If you’d like to help, tell us what happened below.',
        labelName: 'Name',
        labelEmail: 'Email',
        labelComments: 'What happened?',
        labelClose: 'Close',
        labelSubmit: 'Submit Report',
        errorFormEntry: 'Please fill out all required fields',
        successMessage: 'Thank you! Your report has been submitted.',
      },
      ar: {
        title: 'عفوًا! ساعدنا في إصلاح هذا',
        subtitle: 'لقد تم إخطار فريقنا.',
        subtitle2: 'إذا كنت ترغب في المساعدة، أخبرنا بما حدث أدناه.',
        labelName: 'الاسم',
        labelEmail: 'البريد الإلكتروني',
        labelComments: 'ماذا حدث؟',
        labelClose: 'إغلاق',
        labelSubmit: 'إرسال التقرير',
        errorFormEntry: 'يرجى ملء جميع الحقول المطلوبة',
        successMessage: 'شكرًا! تم إرسال تقريرك.',
      },
    }[locale] || {};

    Sentry.showReportDialog({ eventId, ...localized });
  };

  render() {
    const { hasError, error, componentStack, eventId } = this.state;
    const { children, locale = 'en', fallback, showDevStack = true } = this.props;

    const t = {
      en: {
        title: '⚠️ Oops! Something went wrong',
        tryAgain: 'Try Again',
        contact: 'Still having issues?',
        report: 'Report Error',
        details: 'Error Details (Development Only)',
        contactSupport: 'Contact Support',
        errorId: 'Error ID',
      },
      ar: {
        title: '⚠️ عفوا! حدث خطأ ما',
        tryAgain: 'حاول مرة أخرى',
        contact: 'لا تزال تواجه مشكلات؟',
        report: 'الإبلاغ عن خطأ',
        details: 'تفاصيل الخطأ (للمطورين فقط)',
        contactSupport: 'اتصل بالدعم',
        errorId: 'معرف الخطأ',
      },
    }[locale] || t.en;

    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com';

    if (hasError) {
      return (
        fallback || (
          <div className="p-4 max-w-2xl mx-auto text-center" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <h1 className="text-red-600 text-2xl font-bold mb-4">{t.title}</h1>

            {process.env.NODE_ENV === 'development' && showDevStack && (
              <details className="mb-4 text-left bg-red-50 p-4 rounded">
                <summary className="font-medium cursor-pointer">{t.details}</summary>
                <pre className="whitespace-pre-wrap mt-2 text-red-700">
                  {error?.toString()}
                  {"\n"}
                  {componentStack}
                </pre>
                {eventId && (
                  <p className="mt-2 text-sm text-gray-500">{t.errorId}: {eventId}</p>
                )}
              </details>
            )}

            <div className="space-y-4">
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={this.resetError}
                  className="bg-ourArabGreen-500 text-white px-6 py-3 rounded-lg hover:bg-ourArabGreen-600 transition-colors"
                  aria-label={t.tryAgain}
                >
                  {t.tryAgain}
                </button>

                {Sentry.getCurrentHub().getClient() && (
                  <button
                    onClick={this.handleReportError}
                    className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                    aria-label={t.report}
                  >
                    {t.report}
                  </button>
                )}
              </div>

              <p className="text-gray-600 mt-4">
                {t.contact}{' '}
                <a
                  href={`mailto:${supportEmail}?subject=${encodeURIComponent('Website Error Report')}`}
                  className="text-ourArabGreen-600 hover:underline"
                >
                  {t.contactSupport}
                </a>
              </p>
            </div>
          </div>
        )
      );
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  locale: PropTypes.oneOf(['en', 'ar']),
  onReset: PropTypes.func,
  fallback: PropTypes.node,
  useSoftReset: PropTypes.bool,
  showDevStack: PropTypes.bool,
  router: PropTypes.shape({
    pathname: PropTypes.string,
    query: PropTypes.object,
    replace: PropTypes.func,
    locale: PropTypes.string,
    asPath: PropTypes.string,
  }),
};

export default function ErrorBoundaryWrapper(props) {
  const router = useRouter();
  return <ErrorBoundary {...props} router={router} />;
}

ErrorBoundaryWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  locale: PropTypes.oneOf(['en', 'ar']),
  onReset: PropTypes.func,
  fallback: PropTypes.node,
  useSoftReset: PropTypes.bool,
  showDevStack: PropTypes.bool,
};
