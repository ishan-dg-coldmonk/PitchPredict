/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6C63FF', light: '#8B83FF', dark: '#5A52E0' },
        secondary: { DEFAULT: '#FF65B4', light: '#FF8DA4', dark: '#E04E6B' },
        accent: { DEFAULT: '#00D9A6', light: '#33E4BA', dark: '#00B88E' },
        navy: { DEFAULT: '#0F0F1A', light: '#1A1A2E', lighter: '#16213E' },
        gold: '#FFD700',
        silver: '#C0C0C0',
        bronze: '#CD7F32',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Barlow Condensed', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'live-blink': 'liveBlink 1.2s step-end infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(108,99,255,0.2), 0 0 20px rgba(108,99,255,0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(108,99,255,0.4), 0 0 40px rgba(108,99,255,0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        liveBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
