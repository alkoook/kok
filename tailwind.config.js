/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1020',
        surface: '#121a2c',
        mint: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488' }
      },
      fontFamily: { arabic: ['"Noto Sans Arabic Variable"', 'Tahoma', 'Arial', 'sans-serif'] },
      boxShadow: { soft: '0 16px 40px -24px rgb(8 15 31 / 0.45)' }
    }
  },
  plugins: []
};
