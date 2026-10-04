/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Light investigation palette
        navy: {
          950: "#f4faf6",
          900: "#ffffff",
          800: "#edf7f0",
          700: "#dcebe1",
          600: "#c7dbcd",
        },
        slate: {
          850: "#172033",
        },
        // Accent — fresh financial green
        accent: {
          DEFAULT: "#168a5a",
          hover:   "#0f7048",
          muted:   "#bfe9d0",
          subtle:  "#e4f6e9",
        },
        // Status colours — desaturated, professional
        status: {
          confirmed:   "#22c55e",
          pending:     "#f59e0b",
          review:      "#ef4444",
          unknown:     "#6b7280",
          inferred:    "#8b5cf6",
          conflict:    "#f97316",
          document:    "#06b6d4",
        },
        // Layer badge colours
        layer: {
          0: "#3b82f6",  // Victim — blue
          1: "#8b5cf6",  // L1 — purple
          2: "#06b6d4",  // L2 — cyan
          3: "#10b981",  // L3 — emerald
          4: "#f59e0b",  // L4 — amber
          5: "#ef4444",  // L5 — red
        },
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        lg: "0.375rem",
        md: "0.25rem",
        sm: "0.125rem",
      },
      animation: {
        "fade-in":    "fadeIn 0.2s ease-in-out",
        "slide-in-r": "slideInRight 0.25s ease-out",
        "pulse-dot":  "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%":   { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)",    opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%":      { transform: "scale(1.5)", opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};
