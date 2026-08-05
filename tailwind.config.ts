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
          strong: "rgba(27,27,41,0.72)",
          highlight: "rgba(255,255,255,0.14)",
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
        glass:
          "0 20px 50px -22px rgba(0,0,0,0.55), 0 8px 20px -14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.04)",
        "glass-sm":
          "0 10px 26px -14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.03)",
        "glass-inset": "inset 0 1px 3px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,255,255,0.04)",
        glow: "0 0 60px -12px var(--tw-shadow-color)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backdropBlur: {
        "4xl": "72px",
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
        "blob-drift-1": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(6%,8%,0) scale(1.12)" },
          "66%": { transform: "translate3d(-5%,12%,0) scale(0.94)" },
        },
        "blob-drift-2": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-8%,-6%,0) scale(1.15)" },
        },
        "blob-drift-3": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(7%,-9%,0) scale(0.92)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out",
        breathe: "breathe 6s ease-in-out infinite",
        "blob-drift-1": "blob-drift-1 30s ease-in-out infinite",
        "blob-drift-2": "blob-drift-2 36s ease-in-out infinite",
        "blob-drift-3": "blob-drift-3 42s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
