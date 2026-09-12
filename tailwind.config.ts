/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          military: {
            red: '#C8102E',
            'red-dark': '#8B0000',
            'red-light': '#E31837',
            gold: '#FFD700',
            'gold-dark': '#D4A017',
            'gold-light': '#FFEC8B',
            cream: '#FFF5E1',
            'cream-dark': '#F0E6D0',
            green: '#1A5F1E',
            'green-dark': '#0F3D11',
          }
        },
        fontFamily: {
          sans: ['Be Vietnam Pro', 'sans-serif'],
        },
        animation: {
          'float': 'float 3s ease-in-out infinite',
          'marquee': 'marquee 30s linear infinite',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-8px)' },
          },
          marquee: {
            '0%': { transform: 'translateX(0)' },
            '100%': { transform: 'translateX(-50%)' },
          },
        }
      },
    },
    plugins: [],
  }