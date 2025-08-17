import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowUturnLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { motion } from 'framer-motion';

// Config
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ourarabheritage.com';
const SUPPORT = {
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@ourarabheritage.com',
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+966123456789',
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '966123456789'
};

const ERROR_MESSAGES = {
  payment_failed: 'The payment processor declined the transaction.',
  card_declined: 'Your card was declined.',
  insufficient_funds: 'Insufficient funds in your account.',
  expired_card: 'Your card has expired.',
  default: 'The transaction could not be completed.'
};

export default function CancelPage() {
  const router = useRouter();
  const { error_code } = router.query;
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showWhatsAppConfirm, setShowWhatsAppConfirm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (error_code) {
      window.gtag?.('event', 'payment_cancelled', {
        error_code,
        page_path: router.asPath
      });
      if (!ERROR_MESSAGES[error_code]) {
        console.warn(`Unhandled error code: ${error_code}`);
      }
    }
  }, [error_code, router.asPath]);

  const getErrorMessage = () => ERROR_MESSAGES[error_code] || ERROR_MESSAGES.default;

  const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{3})(\d{4})$/);
    return match ? `${match[1]} ${match[2]} ${match[3]} ${match[4]}` : phone;
  };

  const handleWhatsAppClick = (e) => {
    if (!showWhatsAppConfirm) {
      e.preventDefault();
      setShowWhatsAppConfirm(true);
      setTimeout(() => setShowWhatsAppConfirm(false), 5000);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (feedback.trim()) {
      setIsSubmittingFeedback(true);
      try {
        await new Promise((res) => setTimeout(res, 1000));
        alert('Thank you for your feedback!');
        setFeedback('');
      } catch {
        alert('Error submitting feedback. Please try again.');
      } finally {
        setIsSubmittingFeedback(false);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Payment Canceled - Our Arab Heritage</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Your payment was canceled. Return to your cart or contact support." />
        <link rel="canonical" href={`${BASE_URL}/cancel`} />
        <script
          type="application/ld+json"
          nonce={process.env.CSP_NONCE || ''}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CheckoutPage',
              name: 'Payment Canceled',
              description: 'Payment cancellation page for Our Arab Heritage',
              potentialAction: [
                { '@type': 'ViewAction', target: `${BASE_URL}/cart` },
                {
                  '@type': 'ContactPoint',
                  contactType: 'customer service',
                  telephone: SUPPORT.phone.replace(/\s/g, ''),
                  url: `${BASE_URL}/contact`
                }
              ]
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-red-50 dark:bg-red-900 flex flex-col items-center justify-center p-4" role="alert" aria-live="polite">
        <div className="max-w-md w-full text-center space-y-6">

          {/* Icon */}
          <motion.div
            animate={{
              scale: prefersReducedMotion ? 1 : [1, 1.1, 1],
              rotate: prefersReducedMotion ? 0 : [0, -10, 10, 0]
            }}
            transition={{ duration: 0.5, repeat: prefersReducedMotion ? 0 : 2, ease: 'easeInOut', delay: 0.2 }}
            aria-hidden="true"
          >
            <XMarkIcon className="mx-auto h-16 w-16 text-red-600 dark:text-red-300" />
          </motion.div>

          <h1 className="text-3xl font-bold text-red-700 dark:text-red-200">Payment Canceled</h1>

          {error_code && (
            <p className="text-red-600 dark:text-red-300 font-medium">{getErrorMessage()}</p>
          )}

          <p className="text-red-600 dark:text-red-300">
            Your transaction was not completed. You may:
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cart" prefetch={false}>
              <a
                onClick={() => setIsNavigating(true)}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                  isNavigating ? 'bg-red-700 cursor-wait' : 'bg-red-600 hover:bg-red-700'
                } text-white`}
                aria-label="Return to shopping cart"
                aria-busy={isNavigating}
              >
                <ArrowUturnLeftIcon className={`h-5 w-5 ${isNavigating ? 'animate-spin' : ''}`} />
                {isNavigating ? 'Redirecting...' : 'Return to Cart'}
              </a>
            </Link>

            <a
              href={`mailto:${SUPPORT.email}?subject=Payment%20Cancellation%20Help`}
              className="px-6 py-3 text-red-600 dark:text-red-200 underline hover:text-red-700 transition-colors"
              rel="noopener noreferrer"
              aria-label="Contact support via email"
            >
              Email Support
            </a>

            {showWhatsAppConfirm ? (
              <motion.a
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                href={`https://wa.me/${SUPPORT.whatsapp}`}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label="Confirm WhatsApp support"
              >
                Open WhatsApp
              </motion.a>
            ) : (
              <button
                onClick={handleWhatsAppClick}
                className="px-6 py-3 text-green-600 dark:text-green-300 underline hover:text-green-700 transition-colors"
                aria-label="Contact support via WhatsApp"
              >
                WhatsApp
              </button>
            )}
          </div>

          {/* Troubleshooting */}
          <div className="mt-6 text-left">
            <h2 className="font-semibold text-red-600 dark:text-red-300">Troubleshooting Tips</h2>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-red-500 dark:text-red-400">
              <li>Verify payment method details</li>
              <li>Confirm sufficient account funds</li>
              <li>Try an alternative browser</li>
              <li>Clear browser cache and cookies</li>
              {error_code && <li className="font-medium">Reference code: {error_code}</li>}
            </ul>
          </div>

          {/* Phone */}
          <div className="flex flex-col items-center gap-2 mt-6">
            <a
              href={`tel:${SUPPORT.phone.replace(/\s/g, '')}`}
              className="text-sm text-red-500 dark:text-red-300 hover:text-red-700 transition-colors"
              rel="noopener noreferrer"
              aria-label={`Call support at ${formatPhone(SUPPORT.phone)}`}
            >
              Call: {formatPhone(SUPPORT.phone)}
            </a>
            <p className="text-xs text-red-400 dark:text-red-300">(24/7 Availability)</p>
          </div>

          {/* Feedback */}
          <details className="mt-6 text-left border-t border-red-200 pt-4">
            <summary className="text-red-600 dark:text-red-300 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 rounded">
              Help us improve (optional)
            </summary>
            <form onSubmit={handleFeedbackSubmit} className="mt-3 space-y-3">
              <div>
                <label htmlFor="feedback" className="block text-sm text-red-500 dark:text-red-400 mb-1">
                  Why did you cancel?
                </label>
                <textarea
                  id="feedback"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full rounded-md border-red-300 shadow-sm dark:bg-red-800 dark:border-red-600 p-2 text-red-900 dark:text-red-100"
                  placeholder="Optional feedback..."
                  disabled={isSubmittingFeedback}
                />
              </div>
              <button
                type="submit"
                disabled={!feedback.trim() || isSubmittingFeedback}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  feedback.trim() && !isSubmittingFeedback
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                }`}
              >
                {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </details>
        </div>
      </div>
    </>
  );
}
