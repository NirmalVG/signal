import { Braces, Database, FileArchive, ShieldCheck } from "lucide-react"
import { Reveal } from "@/components/landing/reveal"
import { SectionHeading } from "@/components/landing/section-heading"

// Every claim below is taken from the actual backend code in apps/api.
const STEPS = [
  {
    icon: FileArchive,
    title: "Unpack safely",
    body: "Your .zip is extracted with path checks that stop archive tricks from writing outside the project folder.",
    tag: "safe extraction",
  },
  {
    icon: Braces,
    title: "Understand the structure",
    body: "Tree-sitter parses Python, JavaScript, TypeScript and Go into functions, classes and methods. Docs are split by paragraph. Retrieval matches real units of code, not arbitrary slices.",
    tag: "tree-sitter · AST chunks",
  },
  {
    icon: Database,
    title: "Embed and index",
    body: "Each chunk becomes a 1024-dimension vector and is stored in Postgres with pgvector, ready for similarity search.",
    tag: "jina-embeddings-v3 · pgvector",
  },
  {
    icon: ShieldCheck,
    title: "Retrieve, answer, verify",
    body: "Your question is embedded, the closest chunks are retrieved, and the model answers from only that context. Then every citation is checked.",
    tag: "retrieval → generation → check",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-20 md:px-8 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="From a zip file to a cited answer"
          >
            A retrieval-augmented pipeline, built so that each stage can be
            inspected, not just trusted.
          </SectionHeading>
        </Reveal>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 90} className="h-full">
                <div className="group flex h-full flex-col rounded-lg border border-border bg-background p-5 transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-level-2">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-md bg-primary/8 text-primary">
                      <step.icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-text-faint">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-[22px] text-text-muted">
                    {step.body}
                  </p>
                  <p className="mt-4 rounded-sm bg-surface-hover px-2 py-1 font-mono text-[11px] font-medium text-text-muted">
                    {step.tag}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
