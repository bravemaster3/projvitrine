/** @type {import('tailwindcss').Config} */
// Colors, radii and fonts point at CSS variables in src/styles/theme.css.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        chip: "var(--chip)",
        text: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
        accent: "var(--brand)",
        "accent-soft": "var(--accent-soft)",
        "accent-border": "var(--accent-border)",
        "on-accent": "var(--on-accent)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
    },
  },
  plugins: [],
}
