import { tailwindColors } from '../shared-design-tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      },
      boxShadow: {
        glow: '0 20px 45px -20px rgba(65, 90, 119, 0.45)' // Using tertiary-500 RGB
      }
    }
  },
  plugins: []
};
