/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: { 400: '#3AAF4A', subtle: '#E8F5EB', border: '#A8DAB0' },
        ink: { 1: '#162718', 2: '#2D4A2F', 3: '#6B8F6E', 4: '#A8C4AA' },
        app: { bg: '#F3F8EF', card: '#FFFFFF', border: '#D4E8CD' },
      },
    },
  },
  darkMode: 'class',
}
