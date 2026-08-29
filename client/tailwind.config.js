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
        background: '#090d16',
        surface: '#0f172a',
        'surface-elevated': '#1e293b',
        'surface-highlight': '#334155',
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        cyber: {
          cyan: '#00f0ff',
          purple: '#b026ff',
          pink: '#ff007f',
          amber: '#ffb703',
          emerald: '#10b981',
          rose: '#f43f5e'
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-stream': 'flowStream 1.5s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.8))' },
          '50%': { opacity: 0.6, filter: 'drop-shadow(0 0 2px rgba(0, 240, 255, 0.3))' },
        },
        flowStream: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' }
        }
      }
    },
  },
  plugins: [],
}
