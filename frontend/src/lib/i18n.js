import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import config from "../config"
import en from "../locales/en.json"
import fr from "../locales/fr.json"
import sv from "../locales/sv.json"

const STORAGE_KEY = "lang"
const available = { en, fr, sv }
export const languages = config.langs.filter((code) => available[code])

// Order: ?lang= in the URL, saved choice, browser language, configured default.
export const detectLanguage = () => {
  const fromUrl = new URLSearchParams(window.location.search).get("lang")
  let saved = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }
  const browser = (navigator.languages || [navigator.language]).map((l) => l?.slice(0, 2))
  return [fromUrl, saved, ...browser, config.defaultLang].find((code) => languages.includes(code)) || "en"
}

export const setLanguage = (code) => {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // private mode: the choice just isn't remembered
  }
  return i18n.changeLanguage(code)
}

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(languages.map((code) => [code, { translation: available[code] }])),
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  showSupportNotice: false,
})

i18n.on("languageChanged", (code) => {
  document.documentElement.lang = code
})
document.documentElement.lang = i18n.language

export default i18n
