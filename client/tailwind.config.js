/** @type {import('tailwindcss').Config} */
// Colours and fonts taken from the Dailykart Figma file.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        brand: ['"Yatra One"', 'Inter', 'serif'],
      },
      colors: {
        ink: { DEFAULT: '#2A1A15', soft: '#6B5A52', faint: '#A39389' },
        cream: { DEFAULT: '#FFF7EA', deep: '#FCEFD8', line: '#F1DFC2' },
        saffron: { 50: '#FFF4E0', 100: '#FFE7BD', 300: '#FDCB75', 400: '#FDBA52', 500: '#F9A93A', 600: '#E58E1E' },
        maroon: { 50: '#FBEDEB', 100: '#F3D3CF', 500: '#9A2E26', 600: '#8A2620', 700: '#6F1D18' },
        leaf: { 50: '#EAF6EC', 600: '#2E7D3A' },
        // legacy names still used in a few places
        canvas: '#FFF7EA',
        brand: { 50: '#FBEDEB', 100: '#F3D3CF', 200: '#E9B4AD', 400: '#B3473D', 500: '#9A2E26', 600: '#8A2620', 700: '#6F1D18' },
        mint: { 50: '#EAF6EC', 100: '#D4EDD8', 500: '#2E7D3A', 700: '#1F5A29' },
        peach: { 50: '#FFF4E0', 100: '#FFE7BD', 500: '#E58E1E', 700: '#B2650B' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,26,21,0.05), 0 6px 18px -10px rgba(42,26,21,0.18)',
        lift: '0 10px 24px -12px rgba(138,38,32,0.45)',
        pop: '0 18px 48px -16px rgba(42,26,21,0.35)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
};
