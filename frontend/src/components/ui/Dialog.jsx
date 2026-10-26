import * as RadixDialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function Dialog({ open, onOpenChange, title, description, children, wide = false }) {
  const { t } = useTranslation()
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
        <RadixDialog.Content
          className={`fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-card border border-border bg-surface p-6 shadow-xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card ${
            wide ? "sm:max-w-3xl" : "sm:max-w-lg"
          }`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-xl font-semibold tracking-tight">{title}</RadixDialog.Title>
              <RadixDialog.Description className={description ? "mt-1 text-sm text-muted" : "sr-only"}>
                {description || title}
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close
              aria-label={t("common.close")}
              className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-chip"
            >
              <X className="size-5" aria-hidden />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, onConfirm, danger = true }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={body}>
      <div className="flex justify-end gap-3">
        <RadixDialog.Close asChild>
          <button type="button" className="min-h-11 rounded-full border border-border px-4 font-semibold hover:bg-chip">
            {t("common.cancel")}
          </button>
        </RadixDialog.Close>
        <button
          type="button"
          onClick={onConfirm}
          className={`min-h-11 rounded-full px-4 font-semibold ${
            danger ? "bg-danger text-white" : "bg-accent text-on-accent"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
