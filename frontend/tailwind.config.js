/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          950: '#05070d',
          900: '#0a0e18',
          800: '#111827',
          700: '#1a2334',
        },
        accent: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          violet: '#8b5cf6',
        },
        risk: {
          safe: '#22c55e',
          warning: '#eab308',
          high: '#f97316',
          collision: '#ef4444',
          emergency: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.37)',
        glow: '0 0 20px rgba(34,211,238,0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
