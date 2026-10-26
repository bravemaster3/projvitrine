import { Link, Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import config from "../../config"
import { useAuth } from "../../lib/auth"
import Header from "./Header"

function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="no-print mt-20 border-t border-border">
      <div className="container-page flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-muted">
        <p>
          © {new Date().getFullYear()} {config.brandName} · {t("footer.tagline")}
        </p>
        <nav aria-label={t("footer.nav")} className="flex flex-wrap gap-4">
          <Link to="/about" className="hover:text-text">
            {t("nav.about")}
          </Link>
          {config.sourceUrl && (
            <a href={config.sourceUrl} className="hover:text-text">
              {t("footer.source")}
            </a>
          )}
        </nav>
      </div>
    </footer>
  )
}

function LoginBanner() {
  const { t } = useTranslation()
  const { pending, error } = useAuth()
  if (!pending && !error) return null
  return (
    <div role="status" className={`py-2 text-center text-sm ${error ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"}`}>
      {error ? t("auth.failed") : t("auth.signingIn")}
    </div>
  )
}

export default function Layout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        {t("nav.skip")}
      </a>
      <Header />
      <LoginBanner />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
