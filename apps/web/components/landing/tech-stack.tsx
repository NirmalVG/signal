import { Reveal } from "@/components/landing/reveal"
import { SectionHeading } from "@/components/landing/section-heading"

const GROUPS = [
  {
    label: "Interface",
    items: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Tailwind CSS v4",
      "TanStack Query",
      "Zustand",
    ],
  },
  {
    label: "Backend",
    items: ["FastAPI", "Python", "tree-sitter"],
  },
  {
    label: "AI & data",
    items: [
      "Jina embeddings v3",
      "Groq · gpt-oss-120b",
      "Supabase",
      "Postgres + pgvector",
    ],
  },
]

export function TechStack() {
  return (
    <section id="stack" className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-20 md:px-8 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Under the hood"
            title="Built with a modern, honest stack"
          >
            No black boxes: each layer is a standard, replaceable tool.
          </SectionHeading>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {GROUPS.map((g, i) => (
            <Reveal key={g.label} delay={i * 90}>
              <div className="h-full rounded-lg border border-border bg-background p-5">
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-text-faint">
                  {g.label}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {g.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-xs font-medium"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
