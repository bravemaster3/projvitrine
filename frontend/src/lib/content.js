// Helpers for displaying API content: translations, media URLs, tags, dates.
import config from "../config"

export const mediaUrl = (path) => {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${config.apiUrl}${path}`
}

export const displayName = (user) => user?.full_name?.trim() || user?.username || ""

/** Decode the public contact email (reversed + base64 so scrapers don't see it). */
export const decodeContactEmail = (code) => {
  const bytes = Uint8Array.from(atob(code), (c) => c.charCodeAt(0))
  return [...new TextDecoder().decode(bytes)].reverse().join("")
}

/** Pending co-author invites, minus people already listed as authors. */
export const pendingInvites = (project) => {
  const usernames = new Set((project?.users || []).map((u) => u.username?.toLowerCase()))
  return (project?.invites || []).filter(
    (i) => i.status === "pending" && !usernames.has(i.github_username?.toLowerCase())
  )
}

/** Everyone credited on a project except `exclude` (the person whose page it is). */
export const collaborators = (project, exclude) => [
  ...(project?.users || [])
    .filter((u) => u.username !== exclude?.username)
    .map((u) => ({ key: u.username, name: displayName(u), handle: u.handle || u.username })),
  ...pendingInvites(project).map((i) => ({ key: i.github_username, name: `@${i.github_username}`, handle: null })),
]

export const initials = (text = "") =>
  text
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")

export const splitTags = (tags = "") =>
  tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

/** Profile headline/bio in `lang` if translated, else the original. */
export const localizeProfile = (user, lang) => {
  const t = user?.translations?.[lang]
  const original = !t || lang === user?.default_lang
  return {
    headline: (!original && t.headline) || user?.headline || "",
    bio: (!original && t.bio) || user?.bio || "",
    isOriginal: original || (!t.headline && !t.bio),
  }
}

/** Project title/summary/body in `lang` if translated, else the original. */
export const localizeProject = (project, lang) => {
  const t = project?.translations?.[lang]
  return {
    title: t?.title || project?.projectTitle || "",
    summary: t?.summary || project?.description || "",
    body: t?.body || project?.body || "",
    isOriginal: !t || !(t.title || t.summary || t.body),
  }
}

/** Skills from tags across projects, most frequent first (case-insensitive merge). */
export const skillsFrom = (projects = []) => {
  const counts = new Map()
  projects.forEach((p) =>
    splitTags(p.tags).forEach((tag) => {
      const key = tag.toLowerCase()
      const entry = counts.get(key) || { name: tag, count: 0 }
      if (entry.name === entry.name.toLowerCase() && tag !== tag.toLowerCase()) entry.name = tag
      entry.count += 1
      counts.set(key, entry)
    })
  )
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export const hasTag = (project, tag) => splitTags(project.tags).some((t) => t.toLowerCase() === tag.toLowerCase())

export const linkOf = (project, kind) =>
  project?.links?.find((l) => l.kind === kind)?.url ||
  (kind === "code" ? project?.githubRepos : kind === "live" ? project?.liveProject : "") ||
  ""

const monthYear = (date, lang) =>
  new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`))

/** "Nov 2023 – Feb 2025", "2023 – present", or "" */
export const formatPeriod = (start, end, lang, presentLabel) => {
  if (!start) return ""
  return `${monthYear(start, lang)} – ${end ? monthYear(end, lang) : presentLabel}`
}

export const projectYear = (project) =>
  (project?.period_start || project?.created_at || "").slice(0, 4) || ""

export const formatDate = (iso, lang) =>
  iso ? new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : ""

export const portfolioPath = (user) => `/u/${user?.handle || user?.username}`
export const projectPath = (user, project) => `${portfolioPath(user)}/${project.slug}`
