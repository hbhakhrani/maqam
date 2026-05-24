/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Amiri', 'serif'],
      },
      colors: {
        pitch: {
          ref: '#3b82f6',
          user: '#f97316',
          live: '#fb923c',
        },
      },
    },
  },
  plugins: [],
};
