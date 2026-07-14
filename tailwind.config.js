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
          lifecycle: {
            draft: {
              text: '#334155',
              surface: '#f8fafc',
              border: '#e2e8f0',
              accent: '#475569',
            },
            discussion: {
              text: '#176f4c',
              surface: '#eefbf5',
              border: '#b2e9cf',
              accent: '#22a06b',
            },
            consultation: {
              text: '#92400e',
              surface: '#fffbeb',
              border: '#fcd34d',
              accent: '#d97706',
            },
            cda: {
              text: '#3730a3',
              surface: '#eef2ff',
              border: '#c7d2fe',
              accent: '#6366f1',
            },
            resolution: {
              text: '#1e40af',
              surface: '#eff6ff',
              border: '#bfdbfe',
              accent: '#2563eb',
            },
            meeting: {
              text: '#5b21b6',
              surface: '#f5f3ff',
              border: '#ddd6fe',
              accent: '#7c3aed',
            },
            voting: {
              text: '#9a3412',
              surface: '#fff7ed',
              border: '#fdba74',
              accent: '#ea580c',
            },
            execution: {
              text: '#115e59',
              surface: '#f0fdfa',
              border: '#99f6e4',
              accent: '#0d9488',
            },
            archived: {
              text: '#475569',
              surface: '#f1f5f9',
              border: '#cbd5e1',
              accent: '#64748b',
            },
            danger: {
              text: '#991b1b',
              surface: '#fef2f2',
              border: '#fecaca',
              accent: '#b91c1c',
            },
          },
        },
      },
      backgroundImage: {
        'clearstrata-hero':
          'linear-gradient(135deg, #15593e 0%, #176f4c 52%, #1b8a5c 100%)',
      },
      transitionDuration: {
        'motion-instant': '75ms',
        'motion-fast': '150ms',
        'motion-standard': '200ms',
        'motion-panel': '240ms',
        'motion-progress': '300ms',
        'motion-feedback': '360ms',
      },
      transitionTimingFunction: {
        'motion-enter': 'cubic-bezier(0, 0, 0.2, 1)',
        'motion-exit': 'cubic-bezier(0.4, 0, 1, 1)',
        'motion-move': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
