import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useTranslation } from "react-i18next"
import { LoaderCircle, Search, Star } from "lucide-react"
import BrandIcon from "../ui/BrandIcon"

const GITHUB = "https://api.github.com"

/** Fetches what a project form can pre-fill from a public GitHub repository. */
export async function repoDetails(repo) {
  let contributors = []
  try {
    const { data } = await axios.get(`${GITHUB}/repos/${repo.full_name}/contributors`, { params: { per_page: 20 } })
    contributors = data.filter((c) => c.type === "User").map((c) => c.login.toLowerCase())
  } catch {
    contributors = []
  }
  const topics = (repo.topics || []).map((topic) => topic.replace(/-/g, " "))
  return {
    projectTitle: repo.name,
    description: repo.description || "",
    tags: [...new Set([repo.language, ...topics].filter(Boolean))].join(", "),
    githubRepos: repo.html_url,
    liveProject: repo.homepage || "",
    period_start: repo.created_at?.slice(0, 7) || "",
    authors: contributors.join(", "),
  }
}

/** Search the signed-in user's public repositories (no GitHub token needed). */
export default function RepoPicker({ username, onPick }) {
  const { t } = useTranslation()
  const [repos, setRepos] = useState(null)
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const all = []
      for (let page = 1; page <= 5; page++) {
        const { data } = await axios.get(`${GITHUB}/users/${username}/repos`, {
          params: { per_page: 100, page, sort: "pushed" },
        })
        all.push(...data)
        if (data.length < 100) break
      }
      return all
    }
    load()
      .then((list) => active && setRepos(list))
      .catch(() => active && setRepos([]))
    return () => {
      active = false
    }
  }, [username])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (repos || []).filter((r) => !q || `${r.name} ${r.description || ""}`.toLowerCase().includes(q)).slice(0, 8)
  }, [repos, query])

  const pick = async (repo) => {
    setBusy(repo.id)
    try {
      onPick(await repoDetails(repo))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-bg p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <BrandIcon name="github" />
        {t("editor.importTitle")}
      </p>
      <label className="flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-surface px-4 focus-within:border-accent">
        <Search className="size-4 text-muted" aria-hidden />
        <span className="sr-only">{t("editor.importSearch")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("editor.importSearch")}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
        />
      </label>
      {repos === null ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          {t("common.loading")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((repo) => (
            <li key={repo.id}>
              <button
                type="button"
                onClick={() => pick(repo)}
                disabled={busy !== null}
                className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left hover:bg-chip disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{repo.name}</span>
                  {repo.description && <span className="block truncate text-xs text-muted">{repo.description}</span>}
                </span>
                {busy === repo.id ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Star className="size-3" aria-hidden />
                    {repo.stargazers_count}
                  </span>
                )}
              </button>
            </li>
          ))}
          {repos.length > 0 && shown.length === 0 && <li className="px-3 py-2 text-sm text-muted">{t("editor.noRepos")}</li>}
        </ul>
      )}
    </div>
  )
}
