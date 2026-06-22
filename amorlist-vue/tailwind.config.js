/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        amor: {
          pink: '#ec4899',
          dark: '#1a1a2e',
          darker: '#0f0f1a',
        },
      },
    },
  },
  plugins: [],
}