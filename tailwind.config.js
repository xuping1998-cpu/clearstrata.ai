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
          /** 语义状态：供 StatusBadge / StatusAlert，勿在组件内手写散落红黄褐灰 */
          state: {
            success: {
              surface: '#eefbf5',
              border: '#b2e9cf',
              text: '#176f4c',
              solid: '#22a06b',
              onSolid: '#ffffff',
            },
            warning: {
              surface: '#fffbeb',
              border: '#fcd34d',
              text: '#92400e',
              solid: '#d97706',
              onSolid: '#ffffff',
            },
            danger: {
              surface: '#fef2f2',
              border: '#fecaca',
              text: '#991b1b',
              solid: '#b91c1c',
              onSolid: '#ffffff',
            },
            neutral: {
              surface: '#f8fafc',
              border: '#e2e8f0',
              text: '#334155',
              solid: '#475569',
              onSolid: '#ffffff',
            },
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
