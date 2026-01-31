module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {}
  },
  plugins: [require("@tailwindcss/line-clamp")]
};
