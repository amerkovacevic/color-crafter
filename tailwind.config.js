import { tailwindColors, tailwindFonts } from '../shared-design-tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    fontFamily: tailwindFonts,
    extend: {
      colors: tailwindColors,
      boxShadow: {
        glow: '0 20px 45px -20px rgba(65, 90, 119, 0.45)' // Using tertiary-500 RGB
      }
    }
  },
  plugins: []
};
