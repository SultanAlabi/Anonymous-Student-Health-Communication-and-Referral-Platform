/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d2b2a",
        brand: { 50: "#eaf5f3", 100: "#d3ebe7", 200: "#a9d6d0", 500: "#2b8a83", 600: "#1f6f6a", 700: "#195a56" },
        sand: "#f6f4ee",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
