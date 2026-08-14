/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#f0f3f9',
          100: '#d9e0ef',
          200: '#b3c1df',
          300: '#8da2cf',
          400: '#6683bf',
          500: '#4768b0',
          600: '#364f8f',
          700: '#2c3f72',
          800: '#1e2b50',
          900: '#0f1b2e',
          950: '#070f1c',
        },
        gold: {
          50: '#fbf7ef',
          100: '#f5ebd7',
          200: '#ebd6ae',
          300: '#e0c085',
          400: '#d4aa5c',
          500: '#c7a86a',
          600: '#b08840',
          700: '#8c6a32',
          800: '#674d24',
          900: '#432f17',
        },
      },
    },
  },
  plugins: [],
};
