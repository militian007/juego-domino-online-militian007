/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px'
      },
      colors: {
        domino: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#f59e0b',
          cream: '#fef3c7'
        }
      }
    }
  },
  plugins: []
};
