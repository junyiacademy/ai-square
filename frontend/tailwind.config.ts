import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          blue: {
            DEFAULT: "#0363A7",
            50: "#E6F2F9",
            100: "#CCE5F3",
            200: "#99CBE7",
            300: "#66B1DB",
            400: "#3397CF",
            500: "#0363A7",
            600: "#024F86",
            700: "#023B64",
            800: "#012743",
            900: "#011421",
          },
        },
        secondary: {
          orange: {
            DEFAULT: "#EC6C1F",
            50: "#FEF3ED",
            100: "#FDE7DB",
            200: "#FBCFB7",
            300: "#F9B793",
            400: "#F79F6F",
            500: "#EC6C1F",
            600: "#BD5619",
            700: "#8E4113",
            800: "#5F2B0C",
            900: "#2F1606",
          },
        },
        neutral: {
          white: "#FFFFFF",
          cardBg: "#F7F7F7",
          textPrimary: "#222222",
          textSecondary: "#717171",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      fontSize: {
        hero: ["3.5rem", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["2.5rem", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["2rem", { lineHeight: "1.25", fontWeight: "600" }],
        h3: ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        h4: ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        small: ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
      },
      backgroundImage: {
        "gradient-beam": "linear-gradient(135deg, rgba(3,99,167,0.1) 0%, rgba(255,255,255,0) 50%)",
        "gradient-beam-orange": "linear-gradient(135deg, rgba(236,108,31,0.1) 0%, rgba(255,255,255,0) 50%)",
        "gradient-tech-to-human": "linear-gradient(135deg, #0363A7 0%, #EC6C1F 100%)",
        "gradient-blue-radial": "radial-gradient(circle at top left, rgba(3,99,167,0.2) 0%, transparent 50%)",
        "gradient-orange-radial": "radial-gradient(circle at bottom right, rgba(236,108,31,0.2) 0%, transparent 50%)",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        cardHover: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.1)",
      },
      borderRadius: {
        pill: "9999px",
        card: "24px",
      },
      animation: {
        beam: "beam 20s linear infinite",
        "beam-reverse": "beam-reverse 20s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        beam: {
          "0%": { opacity: "0.3", transform: "translateX(-100%) translateY(-100%)" },
          "50%": { opacity: "0.5", transform: "translateX(0%) translateY(0%)" },
          "100%": { opacity: "0.3", transform: "translateX(100%) translateY(100%)" },
        },
        "beam-reverse": {
          "0%": { opacity: "0.3", transform: "translateX(100%) translateY(100%)" },
          "50%": { opacity: "0.5", transform: "translateX(0%) translateY(0%)" },
          "100%": { opacity: "0.3", transform: "translateX(-100%) translateY(-100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
