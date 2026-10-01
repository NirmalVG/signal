import Link from "next/link"
import { MarkGithubIcon } from "@primer/octicons-react"
import { ArrowRight } from "lucide-react"
import { SignalMark } from "@/components/brand/signal-mark"
import { Reveal } from "@/components/landing/reveal"
import { buttonVariants } from "@/components/ui/button"
import { SITE } from "@/lib/site"

export function CtaFooter() {
  return (
    <>
      <section className="mx-auto w-full max-w-[1120px] px-4 py-20 md:px-8 md:py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-xl bg-text px-6 py-14 text-center md:px-12 md:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 h-[260px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/40 blur-3xl"
            />
            <h2 className="relative text-[28px] font-bold leading-9 tracking-[-0.02em] text-white md:text-[36px] md:leading-[44px]">
              See it on your own codebase
            </h2>
            <p className="relative mx-auto mt-3 max-w-[48ch] text-base leading-[26px] text-white/70">
              Drop in a .zip, wait for indexing, and ask your first question in
              under a minute.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
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
                className={buttonVariants({
                  variant: "ghost",
                  size: "lg",
                  className:
                    "border border-white/20 text-white hover:border-white/40 hover:bg-white/10 hover:text-white",
                })}
              >
                <MarkGithubIcon size={16} /> Star on GitHub
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-text-muted md:flex-row md:px-8">
          <div className="flex items-center gap-2.5">
            <SignalMark className="size-5" />
            <span className="font-semibold text-text">Signal</span>
            <span>· Built by {SITE.author}</span>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-5">
            <a
              href={SITE.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-150 hover:text-text"
            >
              Portfolio
            </a>
            <a
              href={SITE.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-150 hover:text-text"
            >
              GitHub
            </a>
            <Link
              href="/workspace"
              className="transition-colors duration-150 hover:text-text"
            >
              Workspace
            </Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
