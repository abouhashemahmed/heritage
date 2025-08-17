import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx}', // Include utility files
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        background: 'var(--background, #ffffff)',
        foreground: 'var(--foreground, #020817)',
        primary: 'var(--primary, #3b82f6)',
        secondary: 'var(--secondary, #64748b)',
        accent: 'var(--accent, #f59e0b)',
        muted: 'var(--muted, #94a3b8)',
        destructive: 'var(--destructive, #ef4444)',
        success: 'var(--success, #22c55e)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        heading: ['var(--font-heading)', 'ui-sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  safelist: [
    {
      pattern: /^(bg|text|border)-(primary|secondary|accent|muted|success|destructive)$/,
      variants: ['hover', 'focus', 'dark'],
    },
  ],
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('tailwindcss-animate'),
    require('@tailwindcss/container-queries'),
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
};

export default config;
