/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'canvas-bg': '#ECECEC',
        'canvas-dots': '#D6D6D6',
        'panel-bg': '#FFFFFF',
        'card-bg': '#FFFFFF',
        'card-border': '#E2E2E2',
        'text-primary': '#2B2F36',
        'text-muted': '#8A9099',
        'accent': '#2D7FF9',
        'accent-orange': '#F0552A',
      },
      borderRadius: {
        card: '6px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
