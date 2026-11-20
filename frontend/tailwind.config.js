/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette du projet : bleu foncé, bleu clair, gris léger, blanc
        marine: { 900: "#0B2A55", 800: "#12376E", 700: "#1D4F91" },
        ciel: { 50: "#F0F6FE", 100: "#E1EDFC", 300: "#93C5FD", 500: "#3B82F6" },
        gris: { 50: "#F5F7FA", 100: "#EBEFF4", 200: "#D9E0E8", 500: "#64748B", 700: "#334155" },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", '"Segoe UI"', "Roboto", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
