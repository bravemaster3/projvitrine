import { createContext, useCallback, useContext, useState } from "react"
import { CircleAlert, CircleCheck } from "lucide-react"

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const notify = useCallback((message, tone = "success") => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list, { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 3500)
  }, [])
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-text px-4 py-2.5 text-sm text-bg shadow-lg"
          >
            {toast.tone === "error" ? (
              <CircleAlert className="size-4 text-danger" aria-hidden />
            ) : (
              <CircleCheck className="size-4 text-[var(--accent-dark)]" aria-hidden />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
