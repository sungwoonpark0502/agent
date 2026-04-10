/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#A8C8F0',
          hover: '#8FB8E8',
          active: '#78A8E0',
          secondary: '#C4B5E0'
        },
        success: '#A8D5A2',
        warning: '#F5D89A',
        error: '#F0A8A8'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'sans-serif'],
        mono: ['"SF Mono"', '"Fira Code"', '"JetBrains Mono"', 'monospace']
      },
      fontSize: {
        'h1': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['20px', { lineHeight: '1.35', fontWeight: '600' }],
        'h3': ['17px', { lineHeight: '1.4', fontWeight: '500' }],
        'h4': ['15px', { lineHeight: '1.4', fontWeight: '500' }],
        'body': ['15px', { lineHeight: '1.47' }],
        'caption': ['13px', { lineHeight: '1.4' }],
        'code': ['13px', { lineHeight: '1.5' }]
      },
      borderRadius: {
        'sm': '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        'pill': '9999px'
      },
      spacing: {
        '4.5': '18px',
        '18': '72px'
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'breathing': 'breathing 2.5s ease-in-out infinite',
        'typing': 'typing 1.2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slide-down 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fade-in 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in':  'scale-in  0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-out': 'scale-out 0.32s cubic-bezier(0.55, 0, 0.8, 0.2)'
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        },
        'breathing': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(168, 200, 240, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(168, 200, 240, 0)' }
        },
        'typing': {
          '0%, 60%, 100%': { opacity: '0.2', transform: 'translateY(0)' },
          '30%': { opacity: '1', transform: 'translateY(-4px)' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-down': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(12px)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.04)', borderRadius: '50px' },
          '45%':  { opacity: '1', transform: 'scale(1.03)', borderRadius: '14px' },
          '68%':  { transform: 'scale(0.985)' },
          '84%':  { transform: 'scale(1.006)' },
          '100%': { opacity: '1', transform: 'scale(1)', borderRadius: '12px' }
        },
        'scale-out': {
          '0%':   { opacity: '1', transform: 'scale(1)',    borderRadius: '12px' },
          '30%':  { opacity: '1', transform: 'scale(1.02)', borderRadius: '14px' },
          '100%': { opacity: '0', transform: 'scale(0.04)', borderRadius: '50px' }
        }
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      transitionDuration: {
        '250': '250ms',
        '400': '400ms'
      }
    }
  },
  plugins: []
}
