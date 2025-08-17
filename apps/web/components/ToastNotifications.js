// components/ToastNotifications.js
// ✅ Global toast notification system with dark mode, accessibility, and close controls

'use client';

import { Toaster, ToastBar, toast } from 'react-hot-toast';

export default function ToastNotifications() {
  return (
    <Toaster
      position="bottom-right"
      gutter={8}
      containerStyle={{ zIndex: 9999 }}
      containerClassName="px-safe-4 pb-safe-4"
      toastOptions={{
        duration: 5000,
        className: 'dark:bg-gray-800 dark:text-white',
        style: {
          maxWidth: '420px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        success: {
          iconTheme: {
            primary: '#3B82F6',
            secondary: 'white',
          },
          ariaProps: {
            role: 'status',
            'aria-live': 'polite',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: 'white',
          },
          ariaProps: {
            role: 'alert',
            'aria-live': 'assertive',
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex items-start gap-3 group">
              <div className="shrink-0 w-5 h-5">{icon}</div>
              <div className="flex-1 text-sm break-words line-clamp-3">
                {!!message && message}
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                onKeyDown={(e) => e.key === 'Enter' && toast.dismiss(t.id)}
                className="opacity-70 hover:opacity-100 transition-opacity
                           text-gray-400 hover:text-gray-600 dark:text-gray-300
                           p-1 -mr-2"
                aria-label="Dismiss notification"
              >
                <CloseIcon />
              </button>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 
               10.59 12 5 17.59 6.41 19 12 13.41 
               17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
