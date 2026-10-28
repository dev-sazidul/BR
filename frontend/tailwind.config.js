/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1F1A17",
        muted: "#5C554E",
        paper: "#F4F1EA",
        line: "#E4DED4",
        brand: {
          DEFAULT: "#0F6E6B",
          dark: "#0C5553",
          soft: "#E5F2F1",
        },
      },
      fontFamily: {
        sans: ["Outfit", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 24px 50px -36px rgba(31, 26, 23, 0.45)",
      },
    },
  },
  plugins: [],
};
