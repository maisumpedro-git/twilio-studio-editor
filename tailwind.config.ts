import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}", "./src/shared/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          50: "#f8fafc",
          100: "#e2e8f0",
          200: "#cbd5f5",
          300: "#a5b4fe",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#312e81",
          900: "#1e1b4b"
        }
      },
      fontFamily: {
        sans: ["'Inter Variable'", ...defaultTheme.fontFamily.sans]
      },
      boxShadow: {
        raised: "0px 4px 24px rgba(15, 23, 42, 0.16)"
      }
    }
  }
};

export default config;
