/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        brick: {
          50: '#fef2f1',
          100: '#fde4e2',
          200: '#fccfcc',
          300: '#f9ada8',
          400: '#f47d75',
          500: '#ea5244',
          600: '#d63a2c',
          700: '#b32e22',
          800: '#952a21',
          900: '#7c2922',
        },
      },
    },
  },
  plugins: [],
}
