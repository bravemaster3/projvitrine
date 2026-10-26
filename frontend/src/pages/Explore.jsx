import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { FolderSearch, Search } from "lucide-react"
import config from "../config"
import api from "../lib/api"
import { useAuth } from "../lib/auth"
import { displayName, hasTag, localizeProject, skillsFrom, splitTags } from "../lib/content"
import useApi from "../lib/useApi"
import useDocumentTitle from "../lib/useDocumentTitle"
import { ProjectCard } from "../components/projects/ProjectCards"
import Button from "../components/ui/Button"
import Chip from "../components/ui/Chip"
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback"

const sorters = {
  newest: (a, b) => b.id - a.id,
  appreciated: (a, b) => (b.likes_count || 0) - (a.likes_count || 0) || b.id - a.id,
  az: (a, b) => a.projectTitle.localeCompare(b.projectTitle),
}

export default function Explore() {
  const { t, i18n } = useTranslation()
  const { user, login } = useAuth()
  useDocumentTitle(`${config.brandName} · ${t("explore.title")}`)
  const projects = useApi(() => api.projects(), [])
  const communities = useApi(() => api.communities(), [])
  const [query, setQuery] = useState("")
  const [tag, setTag] = useState(null)
  const [community, setCommunity] = useState("")
  const [sort, setSort] = useState("newest")

  const list = useMemo(() => projects.data || [], [projects.data])
  const tags = useMemo(() => skillsFrom(list).slice(0, 10), [list])
  const people = useMemo(() => new Set(list.flatMap((p) => (p.users || []).map((u) => u.username))), [list])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list
      .filter((p) => !tag || hasTag(p, tag))
      .filter(
        (p) =>
          !community ||
          (p.users || []).some((u) => (u.memberships || []).some((m) => m.community === community)) ||
          (p.user?.memberships || []).some((m) => m.community === community)
      )
      .filter((p) => {
        if (!q) return true
        const text = localizeProject(p, i18n.resolvedLanguage)
        return [text.title, text.summary, p.tags, ...(p.users || []).map(displayName), p.user?.username]
          .join(" ")
          .toLowerCase()
          .includes(q)
      })
      .sort(sorters[sort])
  }, [list, tag, community, query, sort, i18n.resolvedLanguage])

  if (projects.error) return <ErrorState error={projects.error} />

  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className="text-4xl font-bold leading-tight tracking-[-0.025em] sm:text-[44px]">{t("explore.title")}</h1>
          <p className="text-lg text-muted">{t("explore.subtitle")}</p>
          {!user && (
            <div className="flex flex-wrap gap-2.5 pt-2">
              <Button onClick={login}>{t("explore.cta")}</Button>
              <Button to="/about" variant="secondary">
                {t("explore.learnMore")}
              </Button>
            </div>
          )}
        </div>
        <dl className="flex gap-8">
          {[
            [list.length, t("explore.projects")],
            [people.size, t("explore.builders")],
            [(communities.data || []).length, t("explore.communities")],
          ].map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-3xl font-bold">{projects.loading ? "–" : value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label={t("explore.filters")} className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-4">
        <div className="flex flex-wrap gap-2.5">
          <label className="flex min-h-11 flex-[999_1_320px] items-center gap-2.5 rounded-full border border-border bg-bg px-4 focus-within:border-accent">
            <Search className="size-[18px] text-muted" aria-hidden />
            <span className="sr-only">{t("explore.search")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("explore.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/70"
            />
          </label>
          <label className="flex flex-[1_1_180px]">
            <span className="sr-only">{t("explore.community")}</span>
            <select
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
              className="min-h-11 w-full rounded-full border border-border bg-bg px-4 text-[15px]"
            >
              <option value="">{t("explore.allCommunities")}</option>
              {(communities.data || []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-[1_1_180px]">
            <span className="sr-only">{t("explore.sort")}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-h-11 w-full rounded-full border border-border bg-bg px-4 text-[15px]"
            >
              <option value="newest">{t("explore.newest")}</option>
              <option value="appreciated">{t("explore.mostAppreciated")}</option>
              <option value="az">{t("explore.az")}</option>
            </select>
          </label>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-sm text-muted">{t("explore.popular")}</span>
            <Chip active={!tag} onClick={() => setTag(null)}>
              {t("common.all")}
            </Chip>
            {tags.map((s) => (
              <Chip key={s.name} active={tag === s.name} onClick={() => setTag(tag === s.name ? null : s.name)}>
                {s.name}
              </Chip>
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-muted" aria-live="polite">
        {t("explore.shown", { count: shown.length })}
      </p>

      {projects.loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-80 rounded-card" />
          ))}
        </div>
      ) : shown.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <ProjectCard key={p.id} project={p} showOwner />
          ))}
        </div>
      ) : (
        <EmptyState icon={FolderSearch} title={t("explore.noResults")}>
          {splitTags(query).length ? t("explore.noResultsHint") : null}
        </EmptyState>
      )}
    </div>
  )
}
