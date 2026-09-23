/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Tailwind default palette already includes indigo, emerald, sky, violet, amber, orange, red, gray
      },
    },
  },
  plugins: [],
};
