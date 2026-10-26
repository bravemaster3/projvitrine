// Runtime configuration, read from VITE_* build-time variables (see .env.example).
const env = import.meta.env

const list = (value, fallback) =>
  (value || fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

const config = {
  // Empty means "same origin as the site", which is how production is served.
  apiUrl: (env.VITE_API_URL || "").replace(/\/$/, ""),
  siteUrl: (env.VITE_SITE_URL || window.location.origin).replace(/\/$/, ""),
  githubClientId: env.VITE_GITHUB_CLIENT_ID || "",
  brandName: env.VITE_BRAND_NAME || "Showcase",
  defaultLang: env.VITE_DEFAULT_LANG || "en",
  langs: list(env.VITE_LANGS, "en,fr,sv"),
  // Login only reads the public profile and email; private repos will use a separate GitHub App.
  githubScope: "read:user user:email",
}

export default config
