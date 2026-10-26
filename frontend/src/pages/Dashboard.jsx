import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, Copy, ExternalLink, FolderPlus, Pencil, Plus, Star, Trash2 } from "lucide-react"
import config from "../config"
import api from "../lib/api"
import { useAuth } from "../lib/auth"
import { localizeProject, portfolioPath, projectPath } from "../lib/content"
import useApi from "../lib/useApi"
import useDocumentTitle from "../lib/useDocumentTitle"
import { Cover } from "../components/projects/ProjectCards"
import ProjectEditor from "../components/projects/ProjectEditor"
import Button from "../components/ui/Button"
import { ConfirmDialog } from "../components/ui/Dialog"
import { EmptyState, PageSkeleton } from "../components/ui/Feedback"
import { useToast } from "../components/ui/Toast"

function RowButton({ label, icon: Icon, onClick, disabled, active, danger }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex size-10 items-center justify-center rounded-full transition disabled:opacity-30 ${
        danger ? "text-muted hover:bg-danger-soft hover:text-danger" : "text-muted hover:bg-chip hover:text-text"
      } ${active ? "!text-accent" : ""}`}
    >
      <Icon className={`size-[18px] ${active ? "fill-current" : ""}`} aria-hidden />
    </button>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  useDocumentTitle(`${t("nav.dashboard")} · ${config.brandName}`)
  const handle = user.handle || user.username
  const { data, loading, setData } = useApi(() => api.portfolio(handle), [handle])
  const [order, setOrder] = useState([])
  const [dirty, setDirty] = useState(false)
  const [editing, setEditing] = useState(null) // null | "new" | project
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (data) {
      setOrder(data.projects)
      setDirty(false)
    }
  }, [data])

  // ?new=1 and ?edit=<id> open the editor (links from the header and project pages).
  useEffect(() => {
    if (!data) return
    if (params.get("new")) setEditing("new")
    const editId = Number(params.get("edit"))
    if (editId) setEditing(data.projects.find((p) => p.id === editId) || null)
  }, [params, data])

  const closeEditor = () => {
    setEditing(null)
    if (params.get("new") || params.get("edit")) setParams({}, { replace: true })
  }

  if (loading) return <PageSkeleton />
  const owned = (p) => p.user?.username === user.username
  const permalink = `${config.siteUrl}${portfolioPath(user)}`

  const move = (index, delta) => {
    setOrder((list) => {
      const next = [...list]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })
    setDirty(true)
  }
  const toggleFeatured = (id) => {
    setOrder((list) => list.map((p) => (p.id === id ? { ...p, featured: !p.featured } : p)))
    setDirty(true)
  }
  const saveOrder = async () => {
    const items = order.filter(owned).map((p, index) => ({ id: p.id, order: index, featured: p.featured }))
    await api.reorderProjects(items)
    setData((d) => ({ ...d, projects: order }))
    notify(t("dashboard.orderSaved"))
  }
  const onSaved = (saved) => {
    setData((d) => {
      const exists = d.projects.some((p) => p.id === saved.id)
      return { ...d, projects: exists ? d.projects.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...d.projects] }
    })
  }
  const confirmDelete = async () => {
    await api.deleteProject(deleting.id)
    setData((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== deleting.id) }))
    setDeleting(null)
    notify(t("dashboard.deleted"))
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(permalink)
      notify(t("common.linkCopied"))
    } catch {
      notify(t("common.copyFailed"), "error")
    }
  }

  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="flex flex-wrap items-center gap-2 text-muted">
            {t("dashboard.yourLink")}{" "}
            <Link to={portfolioPath(user)} className="font-mono text-sm text-accent hover:underline">
              {permalink.replace(/^https?:\/\//, "")}
            </Link>
            <button type="button" onClick={copy} aria-label={t("common.copyLink")} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-chip">
              <Copy className="size-4" aria-hidden />
            </button>
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button to={portfolioPath(user)} variant="secondary" icon={ExternalLink}>
            {t("dashboard.viewPortfolio")}
          </Button>
          <Button icon={Plus} onClick={() => setEditing("new")}>
            {t("nav.addProject")}
          </Button>
        </div>
      </div>

      {order.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title={t("dashboard.emptyTitle")}
          action={<Button onClick={() => setEditing("new")}>{t("nav.addProject")}</Button>}
        >
          {t("dashboard.emptyBody")}
        </EmptyState>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{t("dashboard.orderHint")}</p>
            <Button size="sm" disabled={!dirty} onClick={saveOrder}>
              {t("dashboard.saveOrder")}
            </Button>
          </div>
          <ol className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {order.map((project, index) => {
              const { title } = localizeProject(project, i18n.resolvedLanguage)
              const mine = owned(project)
              return (
                <li key={project.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap">
                  <span className="w-6 text-center font-mono text-sm text-muted">{index + 1}</span>
                  <Cover project={project} title={title} className="aspect-[8/5] !w-20 shrink-0 rounded-control" />
                  <div className="min-w-0 flex-1">
                    <Link to={projectPath(user, project)} className="font-semibold hover:underline">
                      {title}
                    </Link>
                    <p className="text-sm text-muted">
                      {mine ? (project.featured ? t("dashboard.featured") : t("dashboard.notFeatured")) : t("dashboard.coauthored", { name: project.user?.username })}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <RowButton label={t("dashboard.moveUp")} icon={ArrowUp} disabled={index === 0} onClick={() => move(index, -1)} />
                    <RowButton label={t("dashboard.moveDown")} icon={ArrowDown} disabled={index === order.length - 1} onClick={() => move(index, 1)} />
                    {mine && (
                      <>
                        <RowButton label={t("dashboard.toggleFeatured")} icon={Star} active={project.featured} onClick={() => toggleFeatured(project.id)} />
                        <RowButton label={t("common.edit")} icon={Pencil} onClick={() => setEditing(project)} />
                        <RowButton label={t("common.delete")} icon={Trash2} danger onClick={() => setDeleting(project)} />
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {editing && (
        <ProjectEditor
          key={editing === "new" ? "new" : editing.id}
          open
          onOpenChange={(open) => !open && closeEditor()}
          project={editing === "new" ? null : editing}
          onSaved={onSaved}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("dashboard.deleteTitle")}
        body={t("dashboard.deleteBody", { title: deleting?.projectTitle })}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
