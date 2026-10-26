import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { MapPin, Search, Users } from "lucide-react"
import config from "../config"
import api from "../lib/api"
import { displayName, localizeProfile } from "../lib/content"
import useApi from "../lib/useApi"
import useDocumentTitle from "../lib/useDocumentTitle"
import Avatar from "../components/ui/Avatar"
import { Badge } from "../components/ui/Chip"
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback"

export function PersonCard({ person }) {
  const { t, i18n } = useTranslation()
  const { headline } = localizeProfile(person, i18n.resolvedLanguage)
  return (
    <Link
      to={`/u/${person.handle || person.username}`}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3">
        <Avatar src={person.avatar} name={displayName(person)} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{displayName(person)}</p>
          <p className="truncate text-sm text-muted">@{person.username}</p>
        </div>
      </div>
      {headline && <p className="line-clamp-2 text-sm text-muted">{headline}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {person.open_to_work && (
          <Badge tone="accent" dot className="!px-2 !py-0.5 !text-xs">
            {t("portfolio.openTo")}
          </Badge>
        )}
        {(person.memberships || []).map((m) => (
          <Badge key={m.community} className="!px-2 !py-0.5 !text-xs">
            {[m.community_name, m.label].filter(Boolean).join(" · ")}
          </Badge>
        ))}
        {person.location && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3.5" aria-hidden />
            {person.location}
          </span>
        )}
      </div>
    </Link>
  )
}

function PeopleGrid({ people, loading }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (people || []).filter((p) =>
      [displayName(p), p.username, p.location, p.headline].join(" ").toLowerCase().includes(q)
    )
  }, [people, query])
  return (
    <>
      <label className="flex min-h-11 max-w-md items-center gap-2.5 rounded-full border border-border bg-surface px-4 focus-within:border-accent">
        <Search className="size-[18px] text-muted" aria-hidden />
        <span className="sr-only">{t("people.search")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("people.search")}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/70"
        />
      </label>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title={t("people.empty")} />
      )}
    </>
  )
}

export default function People() {
  const { t } = useTranslation()
  useDocumentTitle(`${t("people.title")} · ${config.brandName}`)
  const { data, error, loading } = useApi(() => api.users(), [])
  if (error) return <ErrorState error={error} />
  // Placeholder co-author accounts have no handle; they only appear once they join.
  const people = (data || []).filter((u) => u.handle)
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{t("people.title")}</h1>
        <p className="text-lg text-muted">{t("people.subtitle")}</p>
      </div>
      <PeopleGrid people={people} loading={loading} />
    </div>
  )
}

export function CommunityPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const { data, error, loading } = useApi(() => api.community(slug), [slug])
  useDocumentTitle(data ? `${data.name} · ${config.brandName}` : null)
  if (error) return <ErrorState error={error} />
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">{t("community.label")}</span>
        <h1 className="text-4xl font-bold tracking-tight">{loading ? "…" : data.name}</h1>
        {data?.description && <p className="max-w-2xl text-lg text-muted">{data.description}</p>}
        {data?.website && (
          <a href={data.website} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
            {data.website.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>
      <PeopleGrid people={data?.members} loading={loading} />
    </div>
  )
}
