module.exports = {
  plugins: [
    'postcss-import', // Inline @import rules
    'tailwindcss/nesting', // Official Tailwind nesting plugin
    'tailwindcss',
    'postcss-flexbugs-fixes', // Fix flexbox issues
    [
      'postcss-preset-env',
      {
        autoprefixer: {
          flexbox: 'no-2009'
        },
        features: {
          'nesting-rules': false // Disable if using Tailwind nesting
        },
        stage: 3 // CSS features stage
      }
    ],
    process.env.NODE_ENV === 'production' && 'cssnano'
  ].filter(Boolean)
}