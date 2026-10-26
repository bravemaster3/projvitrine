/** Static tag, or a toggle when `onClick` is given. */
export default function Chip({ children, active = false, onClick, count, size = "md", className = "" }) {
  const sizing = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-[13px]"
  if (!onClick) {
    return (
      <span className={`inline-flex items-center rounded-full bg-chip text-muted ${sizing} ${className}`}>
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition ${
        active ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-text hover:bg-chip"
      } ${className}`}
    >
      {children}
      {count != null && <span className="font-mono text-xs opacity-75">{count}</span>}
    </button>
  )
}

export function Badge({ children, tone = "neutral", dot = false, className = "" }) {
  const tones = {
    neutral: "border border-border text-muted",
    accent: "bg-accent-soft text-accent font-semibold",
  }
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] ${tones[tone]} ${className}`}>
      {dot && <span className="size-2 rounded-full bg-accent" aria-hidden />}
      {children}
    </span>
  )
}
