/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#040706",
        surface: "#0a0f0d",
        surfaceHover: "#0e1511",
        primary: "#22c55e",
        primaryMuted: "#16a34a",
        border: "#16211b",
        textPrimary: "#e6f3ec",
        textSecondary: "#7d9389"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        serif: [
          "Source Serif 4",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif"
        ]
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" }
        },
        floatUp: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "15%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(-28px)" }
        }
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        floatUp: "floatUp 1.2s ease-out forwards"
      }
    }
  },
  plugins: []
};
