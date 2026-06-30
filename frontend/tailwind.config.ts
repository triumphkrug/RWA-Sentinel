import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rwa: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          blue: '#1a56db',
          'blue-dark': '#1e3a5f',
          gold: '#b89030',
          'gold-light': '#d4a843',
          amber: '#f4a261',
          'amber-bright': '#f9c784',
          teal: '#2ec4b6',
          red: '#e63946',
          gray: '#64748b',
          'gray-dark': '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'cloud-drift': 'cloudDrift 25s linear infinite',
        'cloud-drift-slow': 'cloudDrift 40s linear infinite reverse',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scanLine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        cloudDrift: {
          '0%': { transform: 'translateX(-30%)' },
          '100%': { transform: 'translateX(130%)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
