import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F0F17",
          soft: "#14141F",
          raised: "#1B1B29",
        },
        glass: {
          border: "rgba(255,255,255,0.08)",
          fill: "rgba(255,255,255,0.04)",
        },
        focus: {
          DEFAULT: "#F2A65A",
          dim: "#8A5F35",
          glow: "rgba(242,166,90,0.35)",
        },
        rest: {
          DEFAULT: "#6FD6C6",
          dim: "#3F7A70",
          glow: "rgba(111,214,198,0.35)",
        },
        paper: "#F5F3ED",
        muted: "#8B8A99",
        danger: "#E8697D",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.35)",
        glow: "0 0 60px -12px var(--tw-shadow-color)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.015)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out",
        breathe: "breathe 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
