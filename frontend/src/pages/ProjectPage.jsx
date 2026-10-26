import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import ReactMarkdown from "react-markdown"
import {
  ArrowLeft,
  BookOpen,
  Copy,
  ExternalLink,
  EyeOff,
  FileText,
  Heart,
  Link2,
  MessageSquare,
  Trash2,
  Video,
} from "lucide-react"
import config from "../config"
import api from "../lib/api"
import { useAuth } from "../lib/auth"
import {
  displayName,
  formatDate,
  formatPeriod,
  localizeProject,
  mediaUrl,
  portfolioPath,
  projectPath,
  splitTags,
} from "../lib/content"
import useApi from "../lib/useApi"
import useDocumentTitle from "../lib/useDocumentTitle"
import { Cover, ProjectCard } from "../components/projects/ProjectCards"
import Avatar from "../components/ui/Avatar"
import BrandIcon from "../components/ui/BrandIcon"
import Button from "../components/ui/Button"
import Chip from "../components/ui/Chip"
import Field from "../components/ui/Field"
import { ErrorState, PageSkeleton } from "../components/ui/Feedback"
import { useToast } from "../components/ui/Toast"

const linkIcons = {
  code: <BrandIcon name="github" />,
  live: <ExternalLink className="size-4" aria-hidden />,
  docs: <BookOpen className="size-4" aria-hidden />,
  paper: <FileText className="size-4" aria-hidden />,
  video: <Video className="size-4" aria-hidden />,
  other: <Link2 className="size-4" aria-hidden />,
}

function SideCard({ title, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">{title}</h2>
      {children}
    </div>
  )
}

function Comments({ project, isOwner }) {
  const { t, i18n } = useTranslation()
  const { user, login } = useAuth()
  const notify = useToast()
  const { data: comments, setData } = useApi(() => api.comments(project.id), [project.id])
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    setSaving(true)
    try {
      const comment = await api.addComment(project.id, draft.trim())
      setData((list) => [comment, ...(list || [])])
      setDraft("")
    } catch {
      notify(t("errors.generic"), "error")
    } finally {
      setSaving(false)
    }
  }
  const remove = async (id) => {
    await api.deleteComment(project.id, id)
    setData((list) => list.filter((c) => c.id !== id))
  }
  const toggleHidden = async (id) => {
    const updated = await api.hideComment(project.id, id)
    setData((list) => list.map((c) => (c.id === id ? updated : c)))
  }

  return (
    <section aria-labelledby="comments" className="flex flex-col gap-4">
      <h2 id="comments" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <MessageSquare className="size-5 text-muted" aria-hidden />
        {t("project.comments")}
      </h2>
      {user ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field
            as="textarea"
            label={t("project.addComment")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
          />
          <Button type="submit" loading={saving} disabled={!draft.trim()} className="self-end">
            {t("project.postComment")}
          </Button>
        </form>
      ) : (
        <p className="text-muted">
          <button type="button" onClick={login} className="font-semibold text-accent hover:underline">
            {t("nav.login")}
          </button>{" "}
          {t("project.loginToComment")}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {(comments || []).map((c) => (
          <li
            key={c.id}
            className={`flex gap-3 rounded-card border border-border bg-surface p-4 ${c.hidden ? "opacity-60" : ""}`}
          >
            <Avatar src={c.user.avatar} name={displayName(c.user)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <Link to={`/u/${c.user.handle || c.user.username}`} className="font-semibold hover:underline">
                  {displayName(c.user)}
                </Link>{" "}
                <span className="text-muted">· {formatDate(c.created_at, i18n.resolvedLanguage)}</span>
                {c.hidden && <span className="ml-2 text-xs text-muted">({t("project.hidden")})</span>}
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-[15px]">{c.content}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => toggleHidden(c.id)}
                  aria-label={c.hidden ? t("project.unhide") : t("project.hide")}
                  title={c.hidden ? t("project.unhide") : t("project.hide")}
                  className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-chip"
                >
                  <EyeOff className="size-4" aria-hidden />
                </button>
              )}
              {(isOwner || c.user.username === user?.username) && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={t("common.delete")}
                  title={t("common.delete")}
                  className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function ProjectPage() {
  const { handle, slug } = useParams()
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const { user: me, login } = useAuth()
  const notify = useToast()
  const { data, error, loading, setData } = useApi(() => api.portfolioProject(handle, slug), [handle, slug])
  const more = useApi(() => api.portfolio(handle), [handle])

  const project = data?.project
  const owner = data?.user
  const text = project ? localizeProject(project, lang) : null
  useDocumentTitle(project ? `${text.title} · ${displayName(owner)}` : null)

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} notFoundTitle={t("project.notFound")} />

  const url = `${config.siteUrl}${projectPath(owner, project)}`
  const isOwner = me?.username === project.user?.username
  const liked = me && project.likes?.includes(me.id)
  const period = formatPeriod(project.period_start, project.period_end, lang, t("project.present"))
  const others = (more.data?.projects || []).filter((p) => p.id !== project.id).slice(0, 3)
  const authors = project.users || []
  const pendingInvites = (project.invites || []).filter((i) => i.status === "pending")
  const meta = [
    project.role && { label: t("project.role"), value: project.role },
    period && { label: t("project.period"), value: period },
    splitTags(project.tags)[0] && { label: t("project.stack"), value: splitTags(project.tags).slice(0, 3).join(", ") },
    { label: t("project.authors"), value: authors.length + pendingInvites.length },
    { label: t("project.appreciations"), value: project.likes_count ?? 0 },
  ].filter(Boolean)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      notify(t("common.linkCopied"))
    } catch {
      notify(t("common.copyFailed"), "error")
    }
  }
  const like = async () => {
    if (!me) return login()
    const result = await api.like(project.id)
    setData((d) => ({
      ...d,
      project: {
        ...d.project,
        likes_count: result.likes_count,
        likes: liked ? d.project.likes.filter((id) => id !== me.id) : [...(d.project.likes || []), me.id],
      },
    }))
  }

  return (
    <div className="container-page flex flex-col gap-12 py-10 sm:py-12">
      <Link
        to={portfolioPath(owner)}
        className="no-print inline-flex min-h-11 items-center gap-2.5 self-start font-medium hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        <Avatar src={owner.avatar} name={displayName(owner)} size="xs" />
        {displayName(owner)}
      </Link>

      <section className="flex max-w-3xl flex-col gap-4">
        {(project.role || period) && <span className="eyebrow">{[project.role, period].filter(Boolean).join(" · ")}</span>}
        <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">{text.title}</h1>
        <p className="text-xl leading-snug text-muted">{text.summary}</p>
        {!text.isOriginal || !project.translations || lang === (project.lang || owner.default_lang) ? null : (
          <p className="text-xs text-muted">{t("common.originalLanguage")}</p>
        )}
        <div className="flex flex-wrap gap-2.5 pt-2">
          {(project.links || []).map((link, i) => (
            <Button key={link.id ?? i} href={link.url} variant={i === 0 ? "primary" : "secondary"} data-print-url>
              {linkIcons[link.kind] || linkIcons.other}
              {link.label || t(`links.${link.kind}`)}
            </Button>
          ))}
        </div>
      </section>

      <dl className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-px overflow-hidden rounded-card border border-border bg-border">
        {meta.map((m) => (
          <div key={m.label} className="flex flex-col-reverse gap-1 bg-surface px-5 py-4">
            <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">{m.label}</dt>
            <dd className="font-semibold">{m.value}</dd>
          </div>
        ))}
      </dl>

      <figure className="flex flex-col gap-3">
        <Cover project={project} title={text.title} className="max-h-[560px] rounded-card border border-border" />
        {project.images?.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {project.images.map((img) => (
              <a key={img.id} href={mediaUrl(img.image)} target="_blank" rel="noopener noreferrer">
                <img
                  src={mediaUrl(img.image)}
                  alt={img.caption || text.title}
                  loading="lazy"
                  className="aspect-[16/10] w-full rounded-control border border-border object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </figure>

      <div className="flex flex-wrap items-start gap-12">
        <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-12">
          {text.body ? (
            <div className="prose-case">
              <ReactMarkdown>{text.body}</ReactMarkdown>
            </div>
          ) : (
            isOwner && (
              <div className="no-print rounded-card border border-dashed border-border p-6 text-muted">
                {t("project.noStory")}{" "}
                <Link to={`/dashboard?edit=${project.id}`} className="font-semibold text-accent hover:underline">
                  {t("project.writeStory")}
                </Link>
              </div>
            )
          )}
          <Comments project={project} isOwner={isOwner} />
        </article>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          {splitTags(project.tags).length > 0 && (
            <SideCard title={t("project.stack")}>
              <div className="flex flex-wrap gap-1.5">
                {splitTags(project.tags).map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </div>
            </SideCard>
          )}
          <SideCard title={t("project.authors")}>
            <ul className="flex flex-col gap-3">
              {authors.map((u) => (
                <li key={u.username}>
                  <Link to={`/u/${u.handle || u.username}`} className="flex items-center gap-2.5 hover:underline">
                    <Avatar src={u.avatar} name={displayName(u)} size="sm" />
                    <span className="flex flex-col leading-tight">
                      <span className="text-[15px] font-semibold">{displayName(u)}</span>
                      <span className="text-[13px] text-muted">@{u.username}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {pendingInvites.map((i) => (
                <li key={i.github_username} className="flex items-center gap-2.5 text-muted">
                  <Avatar name={i.github_username} size="sm" />
                  <a href={`https://github.com/${i.github_username}`} className="text-[15px] hover:underline">
                    @{i.github_username}
                  </a>
                </li>
              ))}
            </ul>
          </SideCard>
          <SideCard title={t("project.share")}>
            <span className="break-all font-mono text-[13px]">{url.replace(/^https?:\/\//, "")}</span>
            <div className="no-print flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={Copy} onClick={copy}>
                {t("common.copyLink")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
              >
                <BrandIcon name="linkedin" />
                LinkedIn
              </Button>
            </div>
          </SideCard>
          <div className="no-print flex items-center justify-between gap-3 rounded-card border border-border px-5 py-4">
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <Heart className={`size-4 ${liked ? "fill-current text-accent" : ""}`} aria-hidden />
              {t("project.appreciationCount", { count: project.likes_count ?? 0 })}
            </span>
            <Button variant="soft" size="sm" onClick={like} aria-pressed={!!liked}>
              {liked ? t("project.appreciated") : t("project.appreciate")}
            </Button>
          </div>
          {isOwner && (
            <Button to={`/dashboard?edit=${project.id}`} variant="secondary" className="no-print">
              {t("project.edit")}
            </Button>
          )}
        </aside>
      </div>

      {others.length > 0 && (
        <section aria-labelledby="more" className="no-print flex flex-col gap-4 border-t border-border pt-10">
          <h2 id="more" className="text-[22px] font-semibold tracking-tight">
            {t("project.moreFrom", { name: displayName(owner).split(" ")[0] })}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((p) => (
              <ProjectCard key={p.id} project={p} owner={owner} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
