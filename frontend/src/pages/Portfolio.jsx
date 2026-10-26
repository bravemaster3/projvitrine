import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Download, Globe, GraduationCap, Mail, MapPin, X as Close } from "lucide-react"
import config from "../config"
import api from "../lib/api"
import { useAuth } from "../lib/auth"
import { displayName, hasTag, localizeProfile, portfolioPath, skillsFrom } from "../lib/content"
import useApi from "../lib/useApi"
import useDocumentTitle from "../lib/useDocumentTitle"
import { FeaturedProject, ProjectCard, ProjectRow } from "../components/projects/ProjectCards"
import Avatar from "../components/ui/Avatar"
import BrandIcon from "../components/ui/BrandIcon"
import Button from "../components/ui/Button"
import Chip, { Badge } from "../components/ui/Chip"
import { EmptyState, ErrorState, PageSkeleton } from "../components/ui/Feedback"
import { useToast } from "../components/ui/Toast"


export function profileLinks(user, t) {
  const links = [
    user.username && { label: "GitHub", href: `https://github.com/${user.username}`, icon: <BrandIcon name="github" /> },
    user.linkedin && { label: "LinkedIn", href: user.linkedin, icon: <BrandIcon name="linkedin" /> },
    user.twitter && { label: "X", href: user.twitter, icon: <BrandIcon name="x" /> },
    user.facebook && { label: "Facebook", href: user.facebook, icon: <BrandIcon name="facebook" /> },
    user.website && { label: t("profile.website"), href: user.website, icon: <Globe className="size-4" aria-hidden /> },
    user.orcid && { label: "ORCID", href: `https://orcid.org/${user.orcid}`, icon: <BrandIcon name="orcid" /> },
    user.scholar && {
      label: "Google Scholar",
      href: user.scholar,
      icon: <GraduationCap className="size-4" aria-hidden />,
    },
  ]
  return links.filter(Boolean)
}

function PermalinkCard({ url, stats }) {
  const { t } = useTranslation()
  const notify = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      notify(t("common.linkCopied"))
    } catch {
      notify(t("common.copyFailed"), "error")
    }
  }
  return (
    <aside className="flex flex-[1_1_300px] flex-col gap-4 self-start rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted">{t("portfolio.permalink")}</p>
      <div className="flex items-center gap-4">
        <div className="rounded-control bg-white p-2 ring-1 ring-border">
          <QRCodeSVG value={url} size={76} level="M" fgColor="#0b1f22" bgColor="#ffffff" title={t("portfolio.qr")} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="break-all font-mono text-sm font-medium">{url.replace(/^https?:\/\//, "")}</span>
          <Button variant="secondary" size="sm" icon={Copy} onClick={copy} className="no-print self-start">
            {t("common.copyLink")}
          </Button>
        </div>
      </div>
      <div className="h-px bg-border" />
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="text-2xl font-bold tracking-tight">{s.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

export default function Portfolio() {
  const { handle } = useParams()
  const { t, i18n } = useTranslation()
  const { user: me } = useAuth()
  const lang = i18n.resolvedLanguage
  const { data, error, loading } = useApi(() => api.portfolio(handle), [handle])
  const [skill, setSkill] = useState(null)

  const user = data?.user
  const projects = useMemo(() => data?.projects || [], [data])
  useDocumentTitle(user ? `${displayName(user)} · ${config.brandName}` : null)
  useEffect(() => setSkill(null), [handle])

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} notFoundTitle={t("portfolio.notFound")} />

  const profile = localizeProfile(user, lang)
  const links = profileLinks(user, t)
  const skills = skillsFrom(projects).slice(0, 16)
  // Only projects the owner marked as featured; no section at all otherwise.
  const featured = projects.filter((p) => p.featured)
  const indexed = skill ? projects.filter((p) => hasTag(p, skill)) : projects
  const coauthors = new Set(projects.flatMap((p) => (p.users || []).map((u) => u.username)))
  coauthors.delete(user.username)
  const permalink = `${config.siteUrl}${portfolioPath(user)}`
  const isMe = me?.username === user.username
  const contactLink = user.linkedin || user.website || `https://github.com/${user.username}`

  return (
    <div className="container-page flex flex-col gap-16 py-12 sm:py-14">
      {/* Hero */}
      <section className="flex flex-wrap items-stretch gap-8">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar src={user.avatar} name={displayName(user)} size="xl" className="ring-4 ring-surface" />
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {user.open_to_work && (
                  <Badge tone="accent" dot>
                    {t("portfolio.openTo")}
                  </Badge>
                )}
                {(user.memberships || []).map((m) => (
                  <Badge key={m.community}>{[m.community_name, m.label].filter(Boolean).join(" · ")}</Badge>
                ))}
              </div>
              {user.location && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <MapPin className="size-4" aria-hidden />
                  {user.location}
                </span>
              )}
            </div>
          </div>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.025em] sm:text-5xl">{displayName(user)}</h1>
          {profile.headline && <p className="text-xl font-medium leading-snug text-accent sm:text-[22px]">{profile.headline}</p>}
          {profile.bio && <p className="max-w-2xl whitespace-pre-line text-[17px] text-muted">{profile.bio}</p>}
          {!profile.isOriginal || lang === user.default_lang ? null : (
            <p className="text-xs text-muted">{t("common.originalLanguage")}</p>
          )}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button href={contactLink} icon={Mail} className="no-print">
              {t("portfolio.getInTouch")}
            </Button>
            {links.map((link) => (
              <Button key={link.label} href={link.href} variant="secondary" data-print-url>
                {link.icon}
                {link.label}
              </Button>
            ))}
          </div>
          {isMe && (
            <div className="no-print flex flex-wrap gap-2.5">
              <Button to="/settings/profile" variant="ghost" size="sm">
                {t("portfolio.editProfile")}
              </Button>
              <Button to="/dashboard" variant="ghost" size="sm">
                {t("portfolio.manageProjects")}
              </Button>
            </div>
          )}
        </div>
        <PermalinkCard
          url={permalink}
          stats={[
            { value: projects.length, label: t("portfolio.stats.projects") },
            { value: coauthors.size, label: t("portfolio.stats.collaborators") },
            { value: projects.reduce((n, p) => n + (p.likes_count || 0), 0), label: t("portfolio.stats.appreciations") },
          ]}
        />
      </section>

      {projects.length === 0 ? (
        <EmptyState title={t("portfolio.empty")} action={isMe && <Button to="/dashboard?new=1">{t("nav.addProject")}</Button>}>
          {isMe ? t("portfolio.emptyMine") : null}
        </EmptyState>
      ) : (
        <>
          {/* Skills */}
          {skills.length > 0 && (
            <section aria-labelledby="skills" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="skills" className="text-[22px] font-semibold tracking-tight">
                  {t("portfolio.skills")}
                </h2>
                <span className="no-print text-sm text-muted">{t("portfolio.skillsHint")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Chip
                    key={s.name}
                    count={s.count}
                    active={skill?.toLowerCase() === s.name.toLowerCase()}
                    onClick={() => setSkill(skill?.toLowerCase() === s.name.toLowerCase() ? null : s.name)}
                  >
                    {s.name}
                  </Chip>
                ))}
              </div>
            </section>
          )}

          {/* Featured */}
          {featured.length > 0 && (
            <section aria-labelledby="featured" className="flex flex-col gap-6">
              <h2 id="featured" className="text-[22px] font-semibold tracking-tight">
                {t("portfolio.featured")}
              </h2>
              <FeaturedProject project={featured[0]} owner={user} />
              {featured.length > 1 && (
                <div className="grid gap-6 sm:grid-cols-2">
                  {featured.slice(1).map((p) => (
                    <ProjectCard key={p.id} project={p} owner={user} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Index */}
          <section aria-labelledby="all-projects" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="all-projects" className="text-[22px] font-semibold tracking-tight">
                {t("portfolio.allProjects")}{" "}
                <span className="font-mono text-[15px] font-normal text-muted">{indexed.length}</span>
              </h2>
              {skill && (
                <button
                  type="button"
                  onClick={() => setSkill(null)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-3 text-sm font-semibold text-accent"
                >
                  {skill}
                  <Close className="size-3.5" aria-hidden />
                  <span className="sr-only">{t("portfolio.clearFilter")}</span>
                </button>
              )}
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {indexed.map((p) => (
                <ProjectRow key={p.id} project={p} owner={user} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Contact */}
      <section
        id="contact"
        className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-accent-border bg-accent-soft p-8 sm:p-10"
      >
        <div className="flex flex-[1_1_400px] flex-col gap-1.5">
          <h2 className="text-[28px] font-bold tracking-tight">{t("portfolio.ctaTitle")}</h2>
          <p className="text-muted">{t("portfolio.ctaBody", { name: displayName(user).split(" ")[0] })}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2.5">
          <Button href={contactLink} size="lg" icon={Mail}>
            {t("portfolio.getInTouch")}
          </Button>
          <Button variant="secondary" size="lg" icon={Download} onClick={() => window.print()}>
            {t("portfolio.downloadPdf")}
          </Button>
        </div>
      </section>
    </div>
  )
}
