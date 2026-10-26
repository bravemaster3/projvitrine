import { useTranslation } from "react-i18next"
import { Monitor, Moon, Sun } from "lucide-react"
import { languages, setLanguage } from "../../lib/i18n"
import { useTheme } from "../../lib/theme"

/** Segmented EN | FR | SV switch; the list comes from VITE_LANGS. */
export function LanguageSwitcher({ className = "" }) {
  const { t, i18n } = useTranslation()
  if (languages.length < 2) return null
  return (
    <div role="group" aria-label={t("nav.language")} className={`flex rounded-full border border-border p-[3px] ${className}`}>
      {languages.map((code) => {
        const active = i18n.resolvedLanguage === code
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            title={t(`languages.${code}`)}
            onClick={() => setLanguage(code)}
            className={`min-h-9 min-w-10 rounded-full px-2 font-mono text-[13px] font-semibold uppercase transition ${
              active ? "bg-accent text-on-accent" : "text-muted hover:text-text"
            }`}
          >
            {code}
          </button>
        )
      })}
    </div>
  )
}

const nextMode = { system: "light", light: "dark", dark: "system" }
const icons = { system: Monitor, light: Sun, dark: Moon }

/** Cycles system → light → dark. */
export function ThemeToggle() {
  const { t } = useTranslation()
  const { mode, setMode } = useTheme()
  const Icon = icons[mode]
  const label = t("theme.toggle", { mode: t(`theme.${mode}`) })
  return (
    <button
      type="button"
      onClick={() => setMode(nextMode[mode])}
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-text transition hover:bg-chip"
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  )
}
