import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px"
      }
    },
    extend: {
      colors: {
        // shadcn/ui slate base — driven by CSS variables in globals.css
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },

        // Aleo brand — direct hex tokens (referenced directly in app code)
        aleo: {
          sky: "var(--color-aleo-sky)",
          cobalt: "var(--color-aleo-cobalt)",
          pale: "var(--color-aleo-pale)",
          navy: "var(--color-aleo-navy)"
        },
        sky: { DEFAULT: "var(--color-aleo-sky)" },
        cobalt: { DEFAULT: "var(--color-aleo-cobalt)" },
        pale: { DEFAULT: "var(--color-aleo-pale)" },
        navy: { DEFAULT: "var(--color-aleo-navy)" },

        // Functional palette
        coin: "var(--color-coin)",
        winGreen: "var(--color-win)",
        lossRed: "var(--color-loss)",
        proGold: "var(--color-pro)",
        proGoldDark: "#C9A700",

        // App neutrals (kept for the cartoon UI built earlier)
        navySurface: "#03307A",
        bgLight: "#FFFFFF",
        surfaceLight: "#F7FBFF",
        ink: "#002157",
        chipBg: "#EAF4FF",
        sparkle: "#A86BFF"
      },
      fontFamily: {
        display: ["var(--font-nunito)", "system-ui", "sans-serif"],
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        chip: "12px",
        card: "16px",
        hero: "24px"
      },
      boxShadow: {
        chunky: "0 4px 0 0 #0047BB",
        chunkyPressed: "0 2px 0 0 #0047BB",
        chunkyGold: "0 4px 0 0 #C9A700",
        chunkyGoldPressed: "0 2px 0 0 #C9A700",
        chunkyDanger: "0 4px 0 0 #C73838",
        chunkyMuted: "0 4px 0 0 #C7C7C7",
        chunkySuccess: "0 4px 0 0 #3F9101",
        card: "0 4px 18px rgba(0,33,87,0.06)",
        hero: "0 12px 40px rgba(42,178,255,0.18)"
      },
      keyframes: {
        wobble: {
          "0%,100%": { transform: "rotate(0)" },
          "25%": { transform: "rotate(3deg)" },
          "75%": { transform: "rotate(-3deg)" }
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-5px)" },
          "40%": { transform: "translateX(5px)" },
          "60%": { transform: "translateX(-5px)" },
          "80%": { transform: "translateX(5px)" }
        },
        flame: {
          "0%,100%": { transform: "scale(1) rotate(-2deg)" },
          "50%": { transform: "scale(1.07) rotate(2deg)" }
        },
        sparkle: {
          "0%,100%": { opacity: "0.4", transform: "scale(0.9)" },
          "50%": { opacity: "1", transform: "scale(1.1)" }
        },
        bobUp: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" }
        }
      },
      animation: {
        wobble: "wobble 2.4s ease-in-out infinite",
        shake: "shake 0.32s ease-in-out",
        flame: "flame 1.6s ease-in-out infinite",
        sparkle: "sparkle 1.8s ease-in-out infinite",
        bob: "bobUp 2.6s ease-in-out infinite"
      }
    }
  },
  plugins: [animate]
};

export default config;
