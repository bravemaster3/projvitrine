import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Plus, Trash2 } from "lucide-react"
import config from "../config"
import countries from "../data/countries.json"
import api from "../lib/api"
import { useAuth } from "../lib/auth"
import { languages } from "../lib/i18n"
import useApi from "../lib/useApi"
import useDocumentTitle from "../lib/useDocumentTitle"
import Button from "../components/ui/Button"
import Field, { Toggle } from "../components/ui/Field"
import { PageSkeleton } from "../components/ui/Feedback"
import { useToast } from "../components/ui/Toast"

const TEXT_FIELDS = ["full_name", "handle", "headline", "bio", "location", "email", "website", "linkedin", "twitter", "facebook", "orcid", "scholar"]

function Section({ title, description, children }) {
  return (
    <section className="grid gap-6 border-t border-border py-8 md:grid-cols-[260px_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

export default function ProfileSettings() {
  const { t } = useTranslation()
  const { setUser } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  useDocumentTitle(`${t("nav.settings")} · ${config.brandName}`)
  const me = useApi(() => api.me(), [])
  const communities = useApi(() => api.communities(), [])
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!me.data) return
    const values = Object.fromEntries(TEXT_FIELDS.map((k) => [k, me.data[k] || ""]))
    setForm({
      ...values,
      open_to_work: !!me.data.open_to_work,
      default_lang: me.data.default_lang || languages[0],
      memberships: me.data.memberships || [],
      translations: me.data.translations || {},
    })
  }, [me.data])

  if (!form) return <PageSkeleton />
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event?.target ? event.target.value : event }))
  const setTranslation = (code, key, value) =>
    setForm((f) => ({ ...f, translations: { ...f.translations, [code]: { ...f.translations[code], [key]: value } } }))
  const setMembership = (index, key, value) =>
    setForm((f) => ({ ...f, memberships: f.memberships.map((m, i) => (i === index ? { ...m, [key]: value } : m)) }))
  const otherLangs = languages.filter((code) => code !== form.default_lang)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        ...form,
        memberships: form.memberships.filter((m) => m.community).map(({ community, label }) => ({ community, label })),
        translations: Object.fromEntries(otherLangs.map((code) => [code, form.translations[code] || { headline: "", bio: "" }])),
      }
      const saved = await api.updateMe(payload)
      setUser(saved)
      notify(t("settings.saved"))
      if (params.get("welcome")) navigate("/dashboard?new=1")
    } catch (error) {
      setErrors(error.response?.data || {})
      notify(t("settings.fixErrors"), "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-page py-12">
      <div className="flex flex-col gap-2 pb-6">
        <h1 className="text-4xl font-bold tracking-tight">{params.get("welcome") ? t("settings.welcome") : t("settings.title")}</h1>
        <p className="text-muted">{t("settings.subtitle")}</p>
      </div>
      <form onSubmit={submit} noValidate>
        <Section title={t("settings.identity")} description={t("settings.identityHint")}>
          <Field label={t("settings.fullName")} value={form.full_name} onChange={set("full_name")} error={errors.full_name} />
          <Field
            label={t("settings.handle")}
            hint={`${config.siteUrl.replace(/^https?:\/\//, "")}/u/${form.handle || "…"}`}
            value={form.handle}
            onChange={set("handle")}
            error={errors.handle}
          />
          <Field label={t("settings.headline")} hint={t("settings.headlineHint")} value={form.headline} onChange={set("headline")} maxLength={160} error={errors.headline} />
          <Field as="textarea" label={t("settings.bio")} value={form.bio} onChange={set("bio")} maxLength={1000} error={errors.bio} />
          <Field as="select" label={t("settings.location")} value={form.location} onChange={set("location")} error={errors.location}>
            <option value="">—</option>
            {form.location && !countries[form.location] && <option value={form.location}>{form.location}</option>}
            {Object.keys(countries).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Field>
          <Toggle label={t("settings.openToWork")} hint={t("settings.openToWorkHint")} checked={form.open_to_work} onChange={set("open_to_work")} />
        </Section>

        <Section title={t("settings.links")} description={t("settings.linksHint")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field type="url" label={t("profile.website")} value={form.website} onChange={set("website")} error={errors.website} />
            <Field type="url" label="LinkedIn" value={form.linkedin} onChange={set("linkedin")} error={errors.linkedin} />
            <Field type="url" label="X / Twitter" value={form.twitter} onChange={set("twitter")} error={errors.twitter} />
            <Field type="url" label="Facebook" value={form.facebook} onChange={set("facebook")} error={errors.facebook} />
            <Field label="ORCID iD" placeholder="0000-0002-1825-0097" value={form.orcid} onChange={set("orcid")} error={errors.orcid} />
            <Field type="url" label="Google Scholar" value={form.scholar} onChange={set("scholar")} error={errors.scholar} />
          </div>
        </Section>

        <Section title={t("settings.communities")} description={t("settings.communitiesHint")}>
          {form.memberships.map((m, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Field as="select" label={t("settings.community")} value={m.community} onChange={(e) => setMembership(i, "community", e.target.value)} className="min-w-44 flex-1">
                <option value="">—</option>
                {(communities.data || []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Field>
              <Field label={t("settings.membershipLabel")} placeholder={t("settings.membershipPlaceholder")} value={m.label || ""} onChange={(e) => setMembership(i, "label", e.target.value)} className="min-w-44 flex-1" />
              <button
                type="button"
                aria-label={t("common.delete")}
                onClick={() => setForm((f) => ({ ...f, memberships: f.memberships.filter((_, j) => j !== i) }))}
                className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" icon={Plus} className="self-start" onClick={() => setForm((f) => ({ ...f, memberships: [...f.memberships, { community: "", label: "" }] }))}>
            {t("settings.addCommunity")}
          </Button>
        </Section>

        <Section title={t("settings.languages")} description={t("settings.languagesHint")}>
          <Field as="select" label={t("settings.writeIn")} value={form.default_lang} onChange={set("default_lang")} className="max-w-xs">
            {languages.map((code) => (
              <option key={code} value={code}>
                {t(`languages.${code}`)}
              </option>
            ))}
          </Field>
          {otherLangs.map((code) => (
            <fieldset key={code} className="flex flex-col gap-3 rounded-card border border-border p-4">
              <legend className="px-1 text-sm font-semibold">{t(`languages.${code}`)}</legend>
              <Field label={t("settings.headline")} value={form.translations[code]?.headline || ""} onChange={(e) => setTranslation(code, "headline", e.target.value)} />
              <Field as="textarea" label={t("settings.bio")} value={form.translations[code]?.bio || ""} onChange={(e) => setTranslation(code, "bio", e.target.value)} />
            </fieldset>
          ))}
        </Section>

        <Section title={t("settings.account")} description={t("settings.accountHint")}>
          <Field type="email" label={t("settings.email")} hint={t("settings.emailHint")} value={form.email} onChange={set("email")} error={errors.email} />
        </Section>

        <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
          <Button type="submit" loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  )
}
