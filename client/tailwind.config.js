/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // System font stack — no external fonts per design spec
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'sans-serif',
        ],
      },
      minHeight: {
        // 44px minimum touch target
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      colors: {
        // Status palette — the only color use per design spec
        // green = success, red = error/low-stock, amber = warning
        // These are already in Tailwind (green-*, red-*, amber-*)
        // Surface palette
        surface: '#F9FAFB',  // gray-50 — light gray surface
        border: '#E5E7EB',   // gray-200 — subtle borders
      },
    },
  },
  plugins: [],
}
