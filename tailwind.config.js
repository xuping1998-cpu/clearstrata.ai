/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clearstrata: {
          brand: {
            50: '#eefbf5',
            100: '#d7f4e6',
            200: '#b2e9cf',
            300: '#7fd9b1',
            400: '#4fc58f',
            500: '#22a06b',
            600: '#1b8a5c',
            700: '#176f4c',
            800: '#15593e',
            900: '#124933',
            950: '#0d3022',
          },
          ui: {
            primary: '#22a06b',
            primaryHover: '#1b8a5c',
            primaryActive: '#176f4c',
            soft: '#eefbf5',
            softBorder: '#d7f4e6',
            softText: '#176f4c',
            heroFrom: '#15593e',
            heroVia: '#176f4c',
            heroTo: '#1b8a5c',
          },
        },
      },
      backgroundImage: {
        'clearstrata-hero':
          'linear-gradient(135deg, #15593e 0%, #176f4c 52%, #1b8a5c 100%)',
      },
    },
  },
  plugins: [],
};
