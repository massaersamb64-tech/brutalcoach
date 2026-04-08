/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brutal: {
          900: '#0f0f0f',
          800: '#1a1a1a',
          700: '#252525',
          600: '#333333',
          500: '#404040',
          400: '#525252',
          300: '#666666',
          200: '#808080',
          100: '#999999',
        },
        productive: {
          500: '#10b981',
          400: '#34d399',
        },
        distraction: {
          500: '#ef4444',
          400: '#f87171',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
