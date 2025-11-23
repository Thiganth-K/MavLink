/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        supercream: '#F3FDEB', // light cream-green background
        supergreen: '#0E5F3A', // primary dark green
        supergreenDark: '#0B4A2E', // deeper shade for footers/borders
        supergreenAccent: '#1B7F4D', // accent (hover, focus)
      }
    },
  },
  plugins: [],
}

