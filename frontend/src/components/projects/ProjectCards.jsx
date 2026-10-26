import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowRight, ExternalLink, Heart } from "lucide-react"
import {
  collaborators,
  displayName,
  initials,
  linkOf,
  localizeProject,
  mediaUrl,
  projectPath,
  projectYear,
  splitTags,
} from "../../lib/content"
import Avatar from "../ui/Avatar"
import BrandIcon from "../ui/BrandIcon"
import Button from "../ui/Button"
import Chip from "../ui/Chip"

export function Cover({ project, title, className = "" }) {
  const src = mediaUrl(project.imgFile)
  if (src) {
    return (
      <img src={src} alt={`${title}`} loading="lazy" className={`w-full bg-chip object-cover ${className}`} />
    )
  }
  return (
    <div
      aria-hidden
      className={`flex w-full items-center justify-center bg-accent-soft font-mono text-3xl font-medium text-accent ${className}`}
    >
      {initials(title)}
    </div>
  )
}

const kindLabel = (project) => splitTags(project.tags)[0] || ""

function Meta({ project }) {
  const year = projectYear(project)
  const kind = project.role || kindLabel(project)
  if (!year && !kind) return null
  return <span className="eyebrow">{[kind, year].filter(Boolean).join(" · ")}</span>
}

function Tags({ project, max = 4, size }) {
  const tags = splitTags(project.tags).slice(0, max)
  if (!tags.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Chip key={tag} size={size}>
          {tag}
        </Chip>
      ))}
    </div>
  )
}

/** "with Ana, Ben +3 more": everyone credited except the person whose page this
 * is. The project page lists them all. */
function Collaborators({ project, exclude, max = 3, className = "text-sm" }) {
  const { t } = useTranslation()
  const people = collaborators(project, exclude)
  if (!people.length) return null
  const hidden = people.length - max
  return (
    <p className={`text-muted ${className}`}>
      {t("project.with")}{" "}
      {people.slice(0, hidden > 0 ? max : people.length).map((person, i) => (
        <span key={person.key}>
          {i > 0 && ", "}
          {person.handle ? (
            <Link to={`/u/${person.handle}`} className="font-medium text-accent hover:underline">
              {person.name}
            </Link>
          ) : (
            <span className="font-medium">{person.name}</span>
          )}
        </span>
      ))}
      {hidden > 0 && <span> {t("project.andMore", { count: hidden })}</span>}
    </p>
  )
}

/** Large featured project: image left, text right. */
export function FeaturedProject({ project, owner }) {
  const { t, i18n } = useTranslation()
  const { title, summary } = localizeProject(project, i18n.resolvedLanguage)
  const code = linkOf(project, "code")
  const live = linkOf(project, "live")
  return (
    <article className="flex flex-wrap overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <Link to={projectPath(owner, project)} className="flex-[1_1_520px]" tabIndex={-1} aria-hidden>
        <Cover project={project} title={title} className="aspect-[16/10] h-full" />
      </Link>
      <div className="flex flex-[1_1_360px] flex-col justify-center gap-3.5 p-7 sm:p-8">
        <Meta project={project} />
        <h3 className="text-3xl font-bold leading-tight tracking-tight">
          <Link to={projectPath(owner, project)} className="hover:underline">
            {title}
          </Link>
        </h3>
        <p className="text-muted">{summary}</p>
        <Collaborators project={project} exclude={owner} />
        <Tags project={project} />
        <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
          <Button to={projectPath(owner, project)} size="md">
            {t("project.caseStudy")}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          {code && (
            <Button href={code} variant="secondary" data-print-url>
              <BrandIcon name="github" />
              {t("project.code")}
            </Button>
          )}
          {live && (
            <Button href={live} variant="secondary" icon={ExternalLink} data-print-url>
              {t("project.live")}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

/** Card for grids (portfolio featured row, explore page). */
export function ProjectCard({ project, owner, showOwner = false }) {
  const { t, i18n } = useTranslation()
  const { title, summary } = localizeProject(project, i18n.resolvedLanguage)
  const author = owner || project.user
  const code = linkOf(project, "code")
  const live = linkOf(project, "live")
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card transition hover:-translate-y-0.5">
      <Link to={projectPath(author, project)} tabIndex={-1} aria-hidden>
        <Cover project={project} title={title} className="aspect-video" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <Meta project={project} />
        <h3 className="text-xl font-semibold tracking-tight">
          <Link to={projectPath(author, project)} className="hover:underline">
            {title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-[15px] text-muted">{summary}</p>
        <Collaborators project={project} exclude={author} />
        <Tags project={project} max={3} size="sm" />
        <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-border pt-3 text-sm font-medium">
          {showOwner && author ? (
            <Link to={`/u/${author.handle || author.username}`} className="flex min-w-0 items-center gap-2 hover:underline">
              <Avatar src={author.avatar} name={displayName(author)} size="xs" />
              <span className="truncate">{displayName(author)}</span>
            </Link>
          ) : (
            <>
              {code && (
                <a href={code} target="_blank" rel="noopener noreferrer" className="hover:text-accent" data-print-url>
                  {t("project.code")}
                </a>
              )}
              {live && (
                <a href={live} target="_blank" rel="noopener noreferrer" className="hover:text-accent" data-print-url>
                  {t("project.live")} ↗
                </a>
              )}
            </>
          )}
          <span className="ml-auto inline-flex items-center gap-1 font-normal text-muted">
            <Heart className="size-3.5" aria-hidden />
            <span className="sr-only">{t("project.appreciations")}:</span>
            {project.likes_count ?? 0}
          </span>
        </div>
      </div>
    </article>
  )
}

/** Compact row for the portfolio's full project index. */
export function ProjectRow({ project, owner }) {
  const { i18n } = useTranslation()
  const { title, summary } = localizeProject(project, i18n.resolvedLanguage)
  return (
    <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
      <Cover project={project} title={title} className="aspect-[8/5] !w-16 shrink-0 rounded-control sm:!w-24" />
      <div className="min-w-0 flex-[999_1_0]">
        <Link to={projectPath(owner, project)} className="text-[17px] font-semibold hover:underline">
          {title}
        </Link>
        <p className="line-clamp-2 text-sm text-muted">{summary}</p>
        <Collaborators project={project} exclude={owner} className="mt-0.5 text-[13px]" />
      </div>
      <div className="hidden flex-[1_1_200px] flex-wrap gap-1.5 md:flex">
        {splitTags(project.tags)
          .slice(0, 3)
          .map((tag) => (
            <Chip key={tag} size="sm">
              {tag}
            </Chip>
          ))}
      </div>
      <span className="hidden w-12 shrink-0 text-right font-mono text-[13px] text-muted sm:block">{projectYear(project)}</span>
    </div>
  )
}
