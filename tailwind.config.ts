import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        chalk: "#f5f1e8",
        sandstone: "#d7c5a6",
        pine: "#29433a",
        moss: "#6d8a61",
        clay: "#9a5f44",
        mist: "#dbe4df",
      },
      boxShadow: {
        card: "0 18px 50px rgba(16, 20, 24, 0.10)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
