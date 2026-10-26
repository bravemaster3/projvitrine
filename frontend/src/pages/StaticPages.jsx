import { Navigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Compass, Globe2, LogIn, QrCode, Sparkles, Users } from "lucide-react"
import config from "../config"
import { useAuth } from "../lib/auth"
import useDocumentTitle from "../lib/useDocumentTitle"
import BrandIcon from "../components/ui/BrandIcon"
import Button from "../components/ui/Button"
import { EmptyState } from "../components/ui/Feedback"

export function About() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  useDocumentTitle(`${t("nav.about")} · ${config.brandName}`)
  const points = [
    { icon: QrCode, key: "permalink" },
    { icon: Sparkles, key: "caseStudies" },
    { icon: Globe2, key: "languages" },
    { icon: Users, key: "community" },
  ]
  return (
    <div className="container-page flex flex-col gap-12 py-14">
      <section className="flex max-w-3xl flex-col gap-4">
        <span className="eyebrow">{t("about.eyebrow", { brand: config.brandName })}</span>
        <h1 className="text-4xl font-bold leading-tight tracking-[-0.025em] sm:text-5xl">{t("about.title")}</h1>
        <p className="text-lg text-muted">{t("about.intro")}</p>
        {!user && (
          <Button onClick={login} size="lg" className="self-start">
            <BrandIcon name="github" />
            {t("about.cta")}
          </Button>
        )}
      </section>
      <section className="grid gap-5 sm:grid-cols-2">
        {points.map(({ icon: Icon, key }) => (
          <div key={key} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6">
            <Icon className="size-6 text-accent" aria-hidden />
            <h2 className="text-lg font-semibold">{t(`about.points.${key}.title`)}</h2>
            <p className="text-muted">{t(`about.points.${key}.body`)}</p>
          </div>
        ))}
      </section>
      <section className="flex max-w-3xl flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{t("about.historyTitle")}</h2>
        <p className="text-muted">{t("about.history")}</p>
      </section>
    </div>
  )
}

export function Login() {
  const { t } = useTranslation()
  const { user, login, pending } = useAuth()
  useDocumentTitle(`${t("nav.login")} · ${config.brandName}`)
  if (user && !pending) return <Navigate to="/dashboard" replace />
  return (
    <div className="container-page flex justify-center py-20">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <LogIn className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{t("auth.title", { brand: config.brandName })}</h1>
        <p className="text-muted">{t("auth.body")}</p>
        <Button onClick={login} size="lg" loading={pending} className="w-full">
          <BrandIcon name="github" />
          {t("auth.github")}
        </Button>
        <p className="text-xs text-muted">{t("auth.scopeNote")}</p>
      </div>
    </div>
  )
}

export function NotFound() {
  const { t } = useTranslation()
  useDocumentTitle(`${t("errors.notFound")} · ${config.brandName}`)
  return (
    <div className="container-page py-20">
      <EmptyState icon={Compass} title={t("errors.notFound")} action={<Button to="/">{t("errors.backHome")}</Button>}>
        {t("errors.notFoundBody")}
      </EmptyState>
    </div>
  )
}

/** /portfolios/:user (old links) → /u/:user */
export function LegacyPortfolioRedirect() {
  const { username } = useParams()
  return <Navigate to={`/u/${username}`} replace />
}

export function RequireAuth({ children }) {
  const { user, pending } = useAuth()
  if (pending) return null
  if (!user) return <Login />
  return children
}
