import type { Metadata } from "next"
import { CtaFooter } from "@/components/landing/cta-footer"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { SiteNav } from "@/components/landing/site-nav"
import { TechStack } from "@/components/landing/tech-stack"
import { Trust } from "@/components/landing/trust"

export const metadata: Metadata = {
  title: "Signal — Ask your codebase. Verify every answer.",
  description:
    "Signal is an AI workspace that answers questions about any repository and cites the exact file and lines behind every claim.",
}

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <Trust />
        <TechStack />
        <CtaFooter />
      </main>
    </>
  )
}
