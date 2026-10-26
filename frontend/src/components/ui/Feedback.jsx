import { useTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"

export function Skeleton({ className = "" }) {
  return <span aria-hidden className={`block animate-pulse rounded-control bg-chip ${className}`} />
}

export function PageSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="container-page space-y-6 py-14" role="status" aria-live="polite">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-72 rounded-card" />
        ))}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-14 text-center">
      {Icon && (
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <p className="max-w-md text-muted">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, notFoundTitle }) {
  const { t } = useTranslation()
  const notFound = error?.response?.status === 404
  return (
    <div className="container-page py-20">
      <EmptyState icon={CircleAlert} title={notFound ? notFoundTitle || t("errors.notFound") : t("errors.generic")}>
        {notFound ? t("errors.notFoundBody") : t("errors.genericBody")}
      </EmptyState>
    </div>
  )
}
