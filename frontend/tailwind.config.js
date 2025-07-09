/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./main.jsx"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1565C0',
          light: '#1E88E5',
          dark: '#0D47A1',
        },
        secondary: {
          DEFAULT: '#26A69A',
          light: '#4DB6AC',
          dark: '#00897B',
        },
        accent: {
          DEFAULT: '#FFA000',
          light: '#FFB74D',
          dark: '#FF8F00',
        },
        background: {
          dark: '#263238',
          DEFAULT: '#37474F',
          light: '#455A64',
        }
      },
      boxShadow: {
        'soft': '0 2px 10px 0 rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 20px 0 rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
