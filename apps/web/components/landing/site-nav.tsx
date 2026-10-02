import Link from "next/link"
import { MarkGithubIcon } from "@primer/octicons-react"
import { UserMenu } from "@/app/auth/user-menu"
import { SignalMark } from "@/components/brand/signal-mark"
import { buttonVariants } from "@/components/ui/button"
import { getAuthUser } from "@/lib/auth/user"
import { SITE } from "@/lib/site"

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#trust", label: "Trust" },
  { href: "#stack", label: "Stack" },
]

export async function SiteNav() {
  const user = await getAuthUser()

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Signal home"
        >
          <SignalMark className="size-7" />
          <span className="text-[17px] font-bold tracking-tight">Signal</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Hidden on phones so the auth controls have room */}
          <a
            href={SITE.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Signal on GitHub"
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: "hidden sm:inline-flex",
            })}
          >
            <MarkGithubIcon size={18} />
          </a>

          {!user && (
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Sign in
            </Link>
          )}

          <Link
            href="/workspace"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Open workspace
          </Link>

          {user && <UserMenu user={user} />}
        </div>
      </div>
    </header>
  )
}
