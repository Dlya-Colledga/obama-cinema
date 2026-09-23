import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: '#000000',
          surface: '#0d0d0d',
          card: '#141414',
          elevated: '#1c1c1c',
          hover: '#242424',
          red: '#FF002F',
          'red-hover': '#e00029',
          'red-glow': 'rgba(255, 0, 47, 0.35)',
          gold: '#F59E0B',
          green: '#10B981',
          muted: '#8E8284',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 25px -3px rgba(255, 0, 47, 0.35)',
        'glow-red-lg': '0 0 45px -5px rgba(255, 0, 47, 0.5)',
      },
    },
  },
  plugins: [],
} satisfies Config;
