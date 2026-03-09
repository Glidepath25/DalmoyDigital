import type { Config } from "tailwindcss";
import { dalmoyBrand } from "./lib/brand/tokens";

const c = dalmoyBrand.colors;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          shell: c.shell,
          shellElevated: c.shellElevated,
          foreground: c.foregroundOnShell,
          primary: c.ink,
          secondary: c.inkMuted,
          accent: c.accent,
          accentHover: c.accentHover,
          accentSoft: c.accentSoft
        },
        app: {
          bg: c.pageBg,
          surface: c.surface,
          muted: c.mutedSurface,
          border: c.border
        },
        semantic: {
          success: c.success,
          warning: c.warning,
          danger: c.danger
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "14px"
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,17,19,0.06), 0 12px 28px rgba(15,17,19,0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
