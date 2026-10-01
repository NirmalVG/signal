"use client"

import { useEffect, useId, useRef } from "react"
import { LoaderCircle, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

// A confirmation modal built on the browser's native <dialog> element.
// showModal() gives us, for free: focus moved into the dialog and trapped
// there, the page behind made inert, rendering in the "top layer" (no
// z-index fights), and a ::backdrop pseudo-element to style.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  // React state is the single source of truth; this just mirrors it onto
  // the element. (`open` as an HTML attribute would show a NON-modal dialog.)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      // Esc fires `cancel`. We stop the browser closing it itself so React
      // stays in charge, and ignore Esc while a request is in flight.
      onCancel={(e) => {
        e.preventDefault()
        if (!pending) onCancel()
      }}
      // A click on the dimmed backdrop is reported with the <dialog> itself
      // as the target; clicks on real content hit the child elements.
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel()
      }}
      // No `display` utility on the <dialog>: it would override the browser's
      // display:none for the closed state. Layout lives on the inner div.
      className="m-auto w-[min(92vw,420px)] rounded-xl border border-border bg-surface p-0 text-text shadow-level-3 backdrop:bg-text/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error-container text-error">
            <TriangleAlert className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            <p
              id={descId}
              className="mt-1 text-sm leading-[22px] text-text-muted"
            >
              {description}
            </p>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-error-container p-2.5 text-xs leading-4 text-on-error-container"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {/* Cancel comes first and gets focus: for a destructive action the
              safe choice should be the one Enter selects. */}
          <Button
            variant="secondary"
            autoFocus
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button variant="danger" disabled={pending} onClick={onConfirm}>
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" /> Deleting…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
