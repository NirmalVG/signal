import { Check, FileSearch, Gauge, Lock, X } from "lucide-react"
import { Reveal } from "@/components/landing/reveal"
import { SectionHeading } from "@/components/landing/section-heading"

const POINTS = [
  {
    icon: FileSearch,
    title: "Citations the model can't invent",
    body: "Signal checks that every file the model cites was actually retrieved for that question. A failed check triggers one stricter retry, then a safe fallback.",
  },
  {
    icon: Gauge,
    title: "Honest confidence",
    body: "The badge shows how closely the best code chunk matched your question. It is not a made-up accuracy score, and it only turns teal above 90%.",
  },
  {
    icon: Lock,
    title: "Safe by design",
    body: "File previews are confined to the project folder. Path traversal, symlink escapes and absolute paths are rejected and covered by tests.",
  },
]

const CHECKS = [
  { file: "answering.py", ok: true, note: "retrieved" },
  { file: "chunker.py", ok: true, note: "retrieved" },
  { file: "payments.py", ok: false, note: "never retrieved: rejected" },
]

// A small picture of the verification idea, in the product's own UI language.
function CheckVisual() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-level-2">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-text-faint">
        Citation check
      </p>
      <ul className="mt-4 space-y-2.5">
        {CHECKS.map((c) => (
          <li
            key={c.file}
            className={
              c.ok
                ? "flex items-center gap-3 rounded-md border border-secondary/25 bg-secondary-container px-3 py-2.5"
                : "flex items-center gap-3 rounded-md border border-error/30 bg-error-container px-3 py-2.5"
            }
          >
            <span
              className={
                c.ok
                  ? "flex size-5 items-center justify-center rounded-full bg-secondary text-white"
                  : "flex size-5 items-center justify-center rounded-full bg-error text-white"
              }
            >
              {c.ok ? (
                <Check className="size-3" strokeWidth={3} />
              ) : (
                <X className="size-3" strokeWidth={3} />
              )}
            </span>
            <span className="font-mono text-xs font-semibold">{c.file}</span>
            <span
              className={
                c.ok
                  ? "ml-auto font-mono text-[11px] text-on-secondary-container"
                  : "ml-auto font-mono text-[11px] text-on-error-container"
              }
            >
              {c.note}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-[18px] text-text-muted">
        One unverified source is enough to reject the whole answer.
      </p>
    </div>
  )
}

export function Trust() {
  return (
    <section
      id="trust"
      className="mx-auto w-full max-w-[1120px] px-4 py-20 md:px-8 md:py-24"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="Why you can trust it"
              title="Every claim has a receipt"
            >
              Language models sound confident even when they&apos;re wrong.
              Signal is designed so you never have to take its word for it.
            </SectionHeading>
          </Reveal>

          <ul className="mt-9 space-y-6">
            {POINTS.map((p, i) => (
              <li key={p.title}>
                <Reveal delay={i * 90} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary-container text-secondary">
                    <p.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{p.title}</h3>
                    <p className="mt-1 text-sm leading-[22px] text-text-muted">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>

        <Reveal delay={150}>
          <CheckVisual />
        </Reveal>
      </div>
    </section>
  )
}
