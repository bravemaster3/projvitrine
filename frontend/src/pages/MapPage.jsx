import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import config from "../config"
import countries from "../data/countries.json"
import api from "../lib/api"
import useDocumentTitle from "../lib/useDocumentTitle"

// Round teal dot markers (no external marker images needed).
const dot = L.divIcon({
  className: "",
  html: '<span style="display:block;width:16px;height:16px;border-radius:999px;background:var(--brand);border:3px solid var(--surface);box-shadow:0 0 0 1px var(--border)"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const escapeHtml = (s = "") =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

export default function MapPage() {
  const { t } = useTranslation()
  useDocumentTitle(`${t("map.title")} · ${config.brandName}`)
  const element = useRef(null)
  const [counts, setCounts] = useState({ people: 0, countries: 0 })

  useEffect(() => {
    const map = L.map(element.current, { worldCopyJump: true, scrollWheelZoom: false }).setView([20, 10], 2)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 12,
    }).addTo(map)
    const cluster = L.markerClusterGroup({ showCoverageOnHover: false })
    let cancelled = false

    api.mapUsers().then((users) => {
      if (cancelled) return
      const placed = users.filter((u) => countries[u.country])
      // Spread people in the same country a little so markers don't stack exactly.
      placed.forEach((u, i) => {
        const [lat, lng] = countries[u.country]
        const jitter = () => ((i * 7919) % 100) / 100 - 0.5
        L.marker([lat + jitter(), lng + jitter()], { icon: dot })
          .bindPopup(
            `<strong>${escapeHtml(u.full_name || u.github_username)}</strong><br>${escapeHtml(u.country)}<br>` +
              `<a href="/u/${encodeURIComponent(u.github_username)}">${escapeHtml(t("map.viewPortfolio"))}</a>`
          )
          .addTo(cluster)
      })
      map.addLayer(cluster)
      setCounts({ people: placed.length, countries: new Set(placed.map((u) => u.country)).size })
    })

    return () => {
      cancelled = true
      map.remove()
    }
  }, [t])

  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">{t("map.title")}</h1>
          <p className="text-lg text-muted">{t("map.subtitle")}</p>
        </div>
        <p className="text-sm text-muted" aria-live="polite">
          {t("map.count", { people: counts.people, countries: counts.countries })}
        </p>
      </div>
      <div
        ref={element}
        role="region"
        aria-label={t("map.title")}
        className="z-0 h-[65vh] min-h-[420px] overflow-hidden rounded-card border border-border"
      />
    </div>
  )
}
