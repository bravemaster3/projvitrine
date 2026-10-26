// App configuration.
//
// In production the web container writes /config.js at start-up from its
// environment variables (see nginx/30-runtime-config.sh), so one pre-built image
// works for any domain. In development, VITE_* variables from .env are used.
const runtime = (typeof window !== "undefined" && window.__APP_CONFIG__) || {}
const env = import.meta.env

const pick = (...values) => values.find((v) => typeof v === "string" && v.trim() !== "")?.trim() || ""
const unquote = (value) => value.replace(/^['"]|['"]$/g, "")
const list = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

export const DEFAULT_BRAND = "ProjVitrine"

const config = {
  // Empty means "same origin as the site", which is how production is served.
  apiUrl: unquote(pick(runtime.apiUrl, env.VITE_API_URL)).replace(/\/$/, ""),
  // VITE_FRONTEND_URL is the name used by the original deployment.
  siteUrl: unquote(
    pick(runtime.siteUrl, env.VITE_SITE_URL, env.VITE_FRONTEND_URL, typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, ""),
  githubClientId: pick(runtime.githubClientId, env.VITE_GITHUB_CLIENT_ID),
  brandName: pick(runtime.brandName, env.VITE_BRAND_NAME) || DEFAULT_BRAND,
  // Optional link to the source code in the footer.
  sourceUrl: pick(runtime.sourceUrl, env.VITE_SOURCE_URL),
  defaultLang: pick(runtime.defaultLang, env.VITE_DEFAULT_LANG) || "en",
  langs: list(pick(runtime.langs, env.VITE_LANGS) || "en,fr,sv"),
  // Login only reads the public profile and email; private repos will use a separate GitHub App.
  githubScope: "read:user user:email",
}

export default config
