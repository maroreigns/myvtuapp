import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf6",
          100: "#d5f7e9",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b"
        },
        ocean: {
          500: "#0ea5e9",
          600: "#0284c7",
          900: "#0c4a6e"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
