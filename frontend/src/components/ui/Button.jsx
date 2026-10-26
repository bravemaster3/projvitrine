import { forwardRef } from "react"
import { Link } from "react-router-dom"
import { LoaderCircle } from "lucide-react"

const variants = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  secondary: "border border-border bg-surface text-text hover:bg-chip",
  soft: "border border-accent-border bg-accent-soft text-accent hover:opacity-90",
  ghost: "text-accent hover:bg-accent-soft",
  danger: "border border-border bg-surface text-danger hover:bg-danger-soft",
}
const sizes = {
  sm: "min-h-9 gap-1.5 px-3 text-sm",
  md: "min-h-11 gap-2 px-4 text-[15px]",
  lg: "min-h-12 gap-2 px-5 text-base",
}

export const buttonClass = ({ variant = "primary", size = "md", className = "" } = {}) =>
  `inline-flex items-center justify-center rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`

/** Button, internal link (`to`) or external link (`href`) with the same look. */
const Button = forwardRef(function Button(
  { variant, size, className, to, href, loading, icon: Icon, children, ...props },
  ref
) {
  const cls = buttonClass({ variant, size, className })
  const content = (
    <>
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className="size-4" aria-hidden />
      )}
      {children}
    </>
  )
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} {...props}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={cls} target="_blank" rel="noopener noreferrer" {...props}>
        {content}
      </a>
    )
  }
  return (
    <button ref={ref} type="button" className={cls} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  )
})

export default Button

export const IconButton = forwardRef(function IconButton({ label, icon: Icon, className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-text transition hover:bg-chip ${className}`}
      {...props}
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  )
})
