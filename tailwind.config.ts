import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0F1C2E",
          secondary: "#2F3B4C",
          accent: "#4C6A8A"
        },
        app: {
          bg: "#F5F6F7",
          surface: "#FFFFFF",
          border: "#D7D9DD"
        },
        semantic: {
          success: "#2E7D32",
          warning: "#F9A825",
          danger: "#C62828"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "14px"
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,28,46,0.06), 0 6px 18px rgba(15,28,46,0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
