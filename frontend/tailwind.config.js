/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F2EBDC',
          light: '#F8F3E7',
          dark: '#E8DFCB',
        },
        ink: {
          DEFAULT: '#2D2A26',
          light: '#6B6258',
          muted: '#9A8F80',
        },
        terra: '#A65A2E',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
