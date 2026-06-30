/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#185FA5',
        accent: '#378ADD',
        'un-fg': 'rgb(var(--un-fg) / <alpha-value>)',
        'un-secondary': 'rgb(var(--un-secondary) / <alpha-value>)',
        'un-tertiary': 'rgb(var(--un-tertiary) / <alpha-value>)',
        'un-surface': 'rgb(var(--un-surface) / <alpha-value>)',
        'un-canvas': 'rgb(var(--un-canvas) / <alpha-value>)',
        'un-border': 'rgb(var(--un-border) / <alpha-value>)',
        'un-wash': 'rgb(var(--un-wash) / <alpha-value>)',
        'un-deep': 'rgb(var(--un-deep) / <alpha-value>)',
        'un-navy': 'rgb(var(--un-navy) / <alpha-value>)',
      },
      boxShadow: {
        'un': 'var(--un-shadow)',
        'un-sm': 'var(--un-shadow-sm)',
        'un-md': 'var(--un-shadow-md)',
        'un-lg': 'var(--un-shadow-lg)',
        'un-inset': 'var(--un-shadow-inset)',
        'un-glow': 'var(--un-shadow-glow)',
      },
    },
  },
  plugins: [],
};
