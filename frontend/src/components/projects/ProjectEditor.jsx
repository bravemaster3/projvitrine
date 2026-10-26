import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import ReactMarkdown from "react-markdown"
import { ImagePlus, Plus, Trash2 } from "lucide-react"
import api from "../../lib/api"
import { useAuth } from "../../lib/auth"
import { languages } from "../../lib/i18n"
import { mediaUrl } from "../../lib/content"
import Button from "../ui/Button"
import Dialog from "../ui/Dialog"
import Field, { Toggle } from "../ui/Field"
import { useToast } from "../ui/Toast"
import RepoPicker from "./RepoPicker"

const EXTRA_KINDS = ["docs", "paper", "video", "other"]
const month = (date) => (date ? date.slice(0, 7) : "")
const toDate = (value) => (value ? `${value}-01` : "")

const fromProject = (project, defaultLang) => ({
  projectTitle: project?.projectTitle || "",
  description: project?.description || "",
  tags: project?.tags || "",
  githubRepos: project?.githubRepos || "",
  liveProject: project?.liveProject || "",
  authors: (project?.authors || "")
    .split(",")
    .map((a) => a.trim())
    .filter((a, i) => a && !(i === 0 && a === project?.user?.username))
    .join(", "),
  role: project?.role || "",
  period_start: month(project?.period_start),
  period_end: month(project?.period_end),
  featured: project?.featured || false,
  body: project?.body || "",
  lang: project?.lang || defaultLang,
  extraLinks: (project?.links || []).filter((l) => EXTRA_KINDS.includes(l.kind)),
  translations: project?.translations || {},
  imgFile: null,
})

function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={`-mb-px min-h-11 border-b-2 px-3.5 text-sm font-medium ${
            value === tab.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default function ProjectEditor({ open, onOpenChange, project, onSaved }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const notify = useToast()
  const defaultLang = user?.default_lang || languages[0]
  const [form, setForm] = useState(() => fromProject(project, defaultLang))
  const [tab, setTab] = useState("details")
  const [preview, setPreview] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const otherLangs = languages.filter((code) => code !== form.lang)
  const coverPreview = useMemo(
    () => (form.imgFile ? URL.createObjectURL(form.imgFile) : mediaUrl(project?.imgFile)),
    [form.imgFile, project]
  )

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event?.target ? event.target.value : event }))
  const setTranslation = (code, key, value) =>
    setForm((f) => ({ ...f, translations: { ...f.translations, [code]: { ...f.translations[code], [key]: value } } }))
  const setLink = (index, key, value) =>
    setForm((f) => ({ ...f, extraLinks: f.extraLinks.map((l, i) => (i === index ? { ...l, [key]: value } : l)) }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    const links = [
      form.githubRepos && { kind: "code", url: form.githubRepos },
      form.liveProject && { kind: "live", url: form.liveProject },
      ...form.extraLinks.filter((l) => l.url),
    ].filter(Boolean)
    const values = {
      projectTitle: form.projectTitle,
      description: form.description,
      tags: form.tags,
      githubRepos: form.githubRepos,
      liveProject: form.liveProject,
      authors: form.authors,
      role: form.role,
      period_start: toDate(form.period_start),
      period_end: toDate(form.period_end),
      featured: form.featured,
      body: form.body,
      lang: form.lang,
      links,
      translations: Object.fromEntries(otherLangs.map((code) => [code, form.translations[code] || {}])),
      imgFile: form.imgFile,
    }
    try {
      const saved = project ? await api.updateProject(project.id, values) : await api.createProject(values)
      notify(project ? t("editor.saved") : t("editor.created"))
      onSaved(saved)
      onOpenChange(false)
    } catch (error) {
      const data = error.response?.data
      setErrors(data && typeof data === "object" ? data : { detail: t("errors.generic") })
      if (data && ["projectTitle", "description", "tags", "githubRepos", "liveProject", "imgFile"].some((k) => data[k])) {
        setTab("details")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={project ? t("editor.editTitle") : t("editor.newTitle")}
      description={t("editor.subtitle")}
    >
      <form onSubmit={submit} noValidate>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "details", label: t("editor.tabs.details") },
            { id: "story", label: t("editor.tabs.story") },
            { id: "translations", label: t("editor.tabs.translations") },
          ]}
        />

        {tab === "details" && (
          <div className="flex flex-col gap-4">
            {!project && user && (
              <RepoPicker username={user.username} onPick={(values) => setForm((f) => ({ ...f, ...values }))} />
            )}
            <Field label={t("editor.title")} value={form.projectTitle} onChange={set("projectTitle")} required maxLength={100} error={errors.projectTitle} />
            <Field as="textarea" label={t("editor.summary")} hint={t("editor.summaryHint")} value={form.description} onChange={set("description")} required error={errors.description} />
            <Field label={t("editor.tags")} hint={t("editor.tagsHint")} value={form.tags} onChange={set("tags")} required error={errors.tags} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field type="url" label={t("editor.code")} value={form.githubRepos} onChange={set("githubRepos")} required placeholder="https://github.com/…" error={errors.githubRepos} />
              <Field type="url" label={t("editor.live")} value={form.liveProject} onChange={set("liveProject")} placeholder="https://…" error={errors.liveProject} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t("editor.cover")}</span>
              <div className="flex flex-wrap items-center gap-4">
                {coverPreview && <img src={coverPreview} alt="" className="aspect-video w-40 rounded-control border border-border object-cover" />}
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-[15px] font-semibold hover:bg-chip focus-within:ring-2 focus-within:ring-accent-border">
                  <ImagePlus className="size-4" aria-hidden />
                  {coverPreview ? t("editor.replaceImage") : t("editor.chooseImage")}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setForm((f) => ({ ...f, imgFile: e.target.files?.[0] || null }))}
                  />
                </label>
              </div>
              {errors.imgFile && <p className="text-xs text-danger">{[].concat(errors.imgFile).join(" ")}</p>}
            </div>
            <Field label={t("editor.coauthors")} hint={t("editor.coauthorsHint")} value={form.authors} onChange={set("authors")} />
            <Toggle label={t("editor.featured")} hint={t("editor.featuredHint")} checked={form.featured} onChange={set("featured")} />
          </div>
        )}

        {tab === "story" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("editor.role")} placeholder={t("editor.rolePlaceholder")} value={form.role} onChange={set("role")} maxLength={120} />
              <Field type="month" label={t("editor.start")} value={form.period_start} onChange={set("period_start")} error={errors.period_start} />
              <Field type="month" label={t("editor.end")} hint={t("editor.endHint")} value={form.period_end} onChange={set("period_end")} error={errors.period_end} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("editor.body")}</span>
                <button type="button" onClick={() => setPreview((p) => !p)} className="text-sm font-medium text-accent hover:underline">
                  {preview ? t("editor.write") : t("editor.preview")}
                </button>
              </div>
              {preview ? (
                <div className="prose-case min-h-60 rounded-control border border-border p-4">
                  <ReactMarkdown>{form.body || t("editor.nothing")}</ReactMarkdown>
                </div>
              ) : (
                <Field as="textarea" label={t("editor.body")} className="[&>label]:sr-only" hint={t("editor.bodyHint")} value={form.body} onChange={set("body")} rows={12} />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("editor.moreLinks")}</span>
              {form.extraLinks.map((link, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <Field as="select" label={t("editor.linkKind")} value={link.kind} onChange={(e) => setLink(i, "kind", e.target.value)} className="w-36">
                    {EXTRA_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(`links.${k}`)}
                      </option>
                    ))}
                  </Field>
                  <Field type="url" label="URL" value={link.url} onChange={(e) => setLink(i, "url", e.target.value)} className="min-w-48 flex-1" />
                  <button
                    type="button"
                    aria-label={t("common.delete")}
                    onClick={() => setForm((f) => ({ ...f, extraLinks: f.extraLinks.filter((_, j) => j !== i) }))}
                    className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                icon={Plus}
                className="self-start"
                onClick={() => setForm((f) => ({ ...f, extraLinks: [...f.extraLinks, { kind: "paper", url: "" }] }))}
              >
                {t("editor.addLink")}
              </Button>
              {errors.links && <p className="text-xs text-danger">{t("editor.linkError")}</p>}
            </div>
          </div>
        )}

        {tab === "translations" && (
          <div className="flex flex-col gap-6">
            <Field as="select" label={t("editor.writtenIn")} value={form.lang} onChange={set("lang")} className="max-w-xs">
              {languages.map((code) => (
                <option key={code} value={code}>
                  {t(`languages.${code}`)}
                </option>
              ))}
            </Field>
            {otherLangs.map((code) => (
              <fieldset key={code} className="flex flex-col gap-3 rounded-card border border-border p-4">
                <legend className="px-1 text-sm font-semibold">{t(`languages.${code}`)}</legend>
                <Field label={t("editor.title")} value={form.translations[code]?.title || ""} onChange={(e) => setTranslation(code, "title", e.target.value)} />
                <Field as="textarea" label={t("editor.summary")} value={form.translations[code]?.summary || ""} onChange={(e) => setTranslation(code, "summary", e.target.value)} />
                <Field as="textarea" label={t("editor.body")} value={form.translations[code]?.body || ""} onChange={(e) => setTranslation(code, "body", e.target.value)} rows={6} />
              </fieldset>
            ))}
            <p className="text-xs text-muted">{t("editor.translationsHint")}</p>
          </div>
        )}

        {errors.detail && <p className="mt-4 text-sm text-danger">{errors.detail}</p>}
        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={saving}>
            {project ? t("common.save") : t("editor.publish")}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
