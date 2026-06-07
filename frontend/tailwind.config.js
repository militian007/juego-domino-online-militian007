/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif']
      },
      colors: {
        domino: {
          dark: '#0a1414',
          felt: '#0d1f1c',
          card: '#142b27',
          accent: '#d4af37',
          'accent-bright': '#f5cf5c',
          cream: '#f4ecd8',
          'cream-dim': '#c9bfa3',
          crimson: '#8b1a2b'
        }
      }
    }
  },
  plugins: []
};
