import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        caption: ["0.8125rem", { lineHeight: "1.4" }],
      },
      colors: {
        /* Semantic theme tokens (CSS variables for audience switching) */
        bg: "var(--color-bg)",
        panel: "var(--color-panel)",
        border: "var(--color-border)",
        foreground: "var(--color-foreground)",
        accent: "var(--color-accent)",
        "accent-foreground": "var(--color-accent-foreground)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        /* Legacy noir/neon (still used where semantic not yet applied) */
        "noir-bg": "#050814",
        "noir-panel": "#050b18",
        "noir-border": "#1f2937",
        "noir-foreground": "#e5e7eb",
        "neon-green": "#00FF41",
        "neon-red": "#FF3131",
        "neon-cyan": "#00d4ff",
      },
      boxShadow: {
        "neon-green":
          "0 0 0 1px rgba(0,255,65,0.5), 0 0 18px rgba(0,255,65,0.6)",
        "neon-red":
          "0 0 0 1px rgba(255,49,49,0.5), 0 0 18px rgba(255,49,49,0.6)",
      },
      backgroundImage: {
        "noir-grid":
          "radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.12) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;

