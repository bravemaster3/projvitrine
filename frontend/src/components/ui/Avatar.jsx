import { initials } from "../../lib/content"

const sizes = {
  xs: "size-7 text-[11px]",
  sm: "size-9 text-xs",
  md: "size-12 text-sm",
  lg: "size-24 text-2xl",
  xl: "size-28 text-3xl",
}

export default function Avatar({ src, name = "", size = "md", className = "" }) {
  const cls = `${sizes[size]} shrink-0 rounded-full object-cover ring-1 ring-border ${className}`
  if (src) return <img src={src} alt="" className={cls} loading="lazy" />
  return (
    <span aria-hidden className={`${cls} inline-flex items-center justify-center bg-chip font-semibold text-muted`}>
      {initials(name) || "?"}
    </span>
  )
}
