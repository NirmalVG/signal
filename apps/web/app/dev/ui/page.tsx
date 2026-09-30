"use client"

// TEMPORARY visual check for design tokens + Button — delete later.
import { ArrowUp, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UiCheck() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-text-muted">
          Variants
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Ask Signal</Button>
          <Button variant="secondary">
            <Upload /> Upload repo
          </Button>
          <Button variant="ghost">Cancel</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-text-muted">
          Sizes + icon
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="ghost" aria-label="Delete">
            <Trash2 />
          </Button>
          <Button size="icon" aria-label="Send">
            <ArrowUp />
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-text-muted">
          Elevation levels
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-surface p-4 font-mono text-xs shadow-level-1">
            level-1
          </div>
          <div className="rounded-lg border border-border-strong bg-surface p-4 font-mono text-xs shadow-level-2">
            level-2
          </div>
          <div className="rounded-lg border border-primary/15 bg-surface p-4 font-mono text-xs shadow-level-3">
            level-3
          </div>
        </div>
      </section>
    </main>
  )
}
