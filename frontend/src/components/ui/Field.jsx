import { useId } from "react"

const control =
  "w-full rounded-control border border-border bg-bg px-3.5 text-[15px] text-text placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-border"

/** Labelled form control: <Field label="Title" value=… onChange=… /> (as="textarea" | "select"). */
export default function Field({ label, hint, error, as = "input", className = "", children, ...props }) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined
  const shared = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, ...props }
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea className={`${control} min-h-28 py-2.5 leading-relaxed`} {...shared} />
      ) : as === "select" ? (
        <select className={`${control} min-h-11`} {...shared}>
          {children}
        </select>
      ) : (
        <input className={`${control} min-h-11`} {...shared} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger">
          {Array.isArray(error) ? error.join(" ") : String(error)}
        </p>
      )}
    </div>
  )
}

export function Toggle({ label, checked, onChange, hint }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-surface shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
      <label htmlFor={id} className="flex flex-col text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-muted">{hint}</span>}
      </label>
    </div>
  )
}
