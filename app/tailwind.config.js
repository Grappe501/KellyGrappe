/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // REQUIRED for manual dark mode toggle

  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],

  theme: {
    extend: {
      colors: {
        civic: {
          navy: '#0f172a',
          deep: '#111827',
          gold: '#d4af37',
          accent: '#4f46e5'
        }
      },

      boxShadow: {
        civic: '0 10px 40px rgba(0,0,0,0.25)',
        glow: '0 0 0 3px rgba(79,70,229,0.4)'
      },

      borderRadius: {
        xl: '14px',
        '2xl': '20px'
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },

  plugins: []
};