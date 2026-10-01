"use client"

import { useState, type DragEvent } from "react"
import { Lock, LoaderCircle, TriangleAlert, Upload } from "lucide-react"
import { useAppConfig } from "@/hooks/use-app-config"
import { useIngest } from "@/hooks/use-ingest"
import { cn } from "@/lib/utils"
import { formatBytes, validateArchive } from "@/lib/validate-upload"
import { useWorkspaceStore } from "@/store/workspace-store"

export function UploadZone() {
  const setActiveRepo = useWorkspaceStore((s) => s.setActiveRepo)
  const ingest = useIngest()
  const { readOnly, ready } = useAppConfig()
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploading = ingest.isPending

  function handleFile(file: File | undefined) {
    if (!file || uploading) return

    const problem = validateArchive(file)
    if (problem) {
      setError(problem)
      return
    }

    setError(null)
    ingest.mutate(file, {
      onSuccess: (data) => setActiveRepo(data.repo_id),
      onError: (err) => setError(err.message),
    })
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault() // otherwise the browser navigates to the dropped file
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function onDragLeave(e: DragEvent<HTMLLabelElement>) {
    // dragleave also fires when the pointer moves onto a CHILD element,
    // which would make the highlight flicker. Only un-highlight when the
    // pointer has truly left the zone.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragging(false)
    }
  }

  // Hooks are all above this line; early returns are only legal below them.
  if (!ready) return null // avoid flashing an upload box that may be hidden
  if (readOnly) {
    return (
      <div className="border-t border-border p-3">
        <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background px-4 py-4 text-center">
          <Lock className="size-5 text-text-muted" />
          <span className="text-[13px] font-semibold">Demo mode</span>
          <span className="text-xs leading-4 text-text-muted">
            Uploads are turned off here. Explore the sample repository above.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-border p-3">
      {/* A <label> wrapping a visually-hidden file input: clicking anywhere
          opens the picker, and the input is a real focusable control, so
          keyboard users get Tab + Enter/Space with zero extra JavaScript. */}
      <label
        onDragEnter={(e) => {
          e.preventDefault()
          if (!uploading) setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()} // required, or drop never fires
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-[1.5px] border-dashed px-4 py-4 text-center transition-[border-color,background-color,box-shadow] duration-150",
          "focus-within:ring-[3px] focus-within:ring-primary/30",
          dragging
            ? "border-primary bg-primary/5 shadow-focus-halo"
            : "border-border-strong hover:border-primary/50 hover:bg-surface-hover",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        <input
          type="file"
          accept=".zip"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = "" // lets the same file be picked again after an error
          }}
        />

        {uploading ? (
          <>
            <LoaderCircle className="size-5 animate-spin text-primary" />
            <span className="text-[13px] font-semibold">Uploading…</span>
            <span className="text-xs text-text-muted">
              Large repos can take a moment
            </span>
          </>
        ) : (
          <>
            <Upload className="size-5 text-text-muted" />
            <span className="text-[13px] font-semibold">
              Drop a .zip or <span className="text-primary">browse</span>
            </span>
            <span className="font-mono text-[11px] text-text-faint">
              up to {formatBytes(200 * 1024 * 1024)}
            </span>
          </>
        )}
      </label>

      {error && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-md bg-error-container p-2.5 text-xs leading-4 text-on-error-container"
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
