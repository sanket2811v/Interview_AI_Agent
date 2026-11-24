/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          border: 'var(--border-subtle)',
          borderHover: 'var(--border-hover)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
        },
        brand: {
          violet: '#7C3AED',
          violetLight: '#8B5CF6',
          violetDark: '#6D28D9',
          blue: '#2563EB',
          blueLight: '#3B82F6',
          darkBg: '#0B1020',
          darkSurface: '#151C2E',
          darkBorder: '#27324A'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)'
      }
    },
  },
  plugins: [],
}
