/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // The demo palette (demo/*/index.html :root block).
      colors: {
        bg: "#0A0A0C",
        surface: "#16161A",
        surface2: "#1C1C22",
        border: "#24242B",
        fg: "#F1F5F9",
        muted: "#94A3B8",
        faint: "#64748B",
        sky: "#38BDF8",
        purple: "#A855F7",
        rose: "#F43F5E",
        green: "#10B981",
        amber: "#F59E0B",
      },
    },
  },
  plugins: [],
};
