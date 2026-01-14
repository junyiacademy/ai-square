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
        // Junyi Academy Brand Colors
        primary: {
          blue: "#0363A7",
          DEFAULT: "#0363A7",
        },
        secondary: {
          orange: "#EC6C1F",
          DEFAULT: "#EC6C1F",
        },
        // Extended palette for gradients and variations
        accent: {
          blue: {
            light: "#4A9FD8",
            DEFAULT: "#0363A7",
            dark: "#024A7A",
          },
          orange: {
            light: "#FF8A4C",
            DEFAULT: "#EC6C1F",
            dark: "#C55419",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      // Typography Scale
      fontSize: {
        hero: ["3.5rem", { lineHeight: "1.1", fontWeight: "700" }], // 56px
        "hero-lg": ["4.5rem", { lineHeight: "1.1", fontWeight: "700" }], // 72px
        "hero-xl": ["6rem", { lineHeight: "1.05", fontWeight: "700" }], // 96px
        h1: ["3rem", { lineHeight: "1.2", fontWeight: "600" }], // 48px
        h2: ["2.25rem", { lineHeight: "1.25", fontWeight: "600" }], // 36px
        h3: ["1.875rem", { lineHeight: "1.3", fontWeight: "600" }], // 30px
        h4: ["1.5rem", { lineHeight: "1.4", fontWeight: "600" }], // 24px
        h5: ["1.25rem", { lineHeight: "1.5", fontWeight: "600" }], // 20px
        h6: ["1.125rem", { lineHeight: "1.5", fontWeight: "600" }], // 18px
      },
      // Brand Gradients
      backgroundImage: {
        "gradient-blue-orange":
          "linear-gradient(135deg, #0363A7 0%, #EC6C1F 100%)",
        "gradient-orange-blue":
          "linear-gradient(135deg, #EC6C1F 0%, #0363A7 100%)",
        "gradient-blue-radial":
          "radial-gradient(circle at top left, #0363A7, transparent 50%)",
        "gradient-orange-radial":
          "radial-gradient(circle at bottom right, #EC6C1F, transparent 50%)",
        // The Intersection X pattern
        "intersection-pattern":
          "linear-gradient(135deg, #0363A7 0%, transparent 50%, #EC6C1F 100%)",
      },
      // Shadow Tokens
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        // Glassmorphism shadows
        glass:
          "0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.1)",
        "glass-blue":
          "0 8px 32px 0 rgba(3, 99, 167, 0.2), inset 0 0 20px rgba(3, 99, 167, 0.1)",
        "glass-orange":
          "0 8px 32px 0 rgba(236, 108, 31, 0.2), inset 0 0 20px rgba(236, 108, 31, 0.1)",
      },
      // Animation utilities
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        beam: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "slide-in-left": "slide-in-left 0.6s ease-out",
        "slide-in-right": "slide-in-right 0.6s ease-out",
        beam: "beam 2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
