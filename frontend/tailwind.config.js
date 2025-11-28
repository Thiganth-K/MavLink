/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        supercream: '#F5F3FF', // light lavender background
        supergreen: '#6E2CAF', // primary purple (brand)
        supergreenDark: '#4B1D8C', // deeper purple for headers/footers
        supergreenAccent: '#A100FF', // accent purple (hover, focus)
      }
    },
  },
  plugins: [],
}

