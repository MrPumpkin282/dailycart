/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: { DEFAULT: '#1D1B26', soft: '#5E5B6E', faint: '#9A97A8' },
        canvas: '#F5F4FA',
        brand: {
          50: '#F1EFFE',
          100: '#E3DFFD',
          200: '#C9C1FB',
          400: '#8B7CF6',
          500: '#6C5CE7',
          600: '#5847D4',
          700: '#4636AE',
        },
        mint: { 50: '#E9FBF3', 100: '#CFF5E3', 500: '#1FB37A', 700: '#12805A' },
        peach: { 50: '#FFF3EC', 100: '#FFE3D3', 500: '#FF8A4C', 700: '#C85A1E' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,27,38,0.04), 0 8px 24px -12px rgba(29,27,38,0.12)',
        lift: '0 12px 32px -12px rgba(108,92,231,0.35)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
};
