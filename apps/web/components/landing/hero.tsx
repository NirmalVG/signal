import Link from "next/link"
import { MarkGithubIcon } from "@primer/octicons-react"
import { ArrowRight } from "lucide-react"
import { HeroDemo } from "@/components/landing/hero-demo"
import { buttonVariants } from "@/components/ui/button"
import { SITE } from "@/lib/site"

const PROOF = [
  "Tree-sitter chunking",
  "pgvector retrieval",
  "Validated citations",
]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative backdrop: a faint grid that fades out, plus an indigo glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[length:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-120px] -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-4 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] font-semibold text-text-muted shadow-level-1">
            <span className="size-1.5 rounded-full bg-secondary" />
            AI workspace for codebases
          </p>

          <h1 className="mt-6 text-[32px] font-bold leading-10 tracking-[-0.02em] md:text-5xl md:leading-[56px] md:tracking-[-0.03em]">
            Ask your codebase.
            <br />
            Get answers you can{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              verify
            </span>
            .
          </h1>

          <p className="mt-5 max-w-[52ch] text-base leading-[26px] text-text-muted md:text-[17px]">
            Signal reads a repository the way an engineer would, then answers
            your questions and points to the exact file and lines behind every
            claim.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/workspace"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Open the workspace <ArrowRight />
            </Link>
            <a
              href={SITE.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <MarkGithubIcon size={16} /> View on GitHub
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] font-medium text-text-muted">
            {PROOF.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-secondary" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <HeroDemo />
      </div>
    </section>
  )
}
