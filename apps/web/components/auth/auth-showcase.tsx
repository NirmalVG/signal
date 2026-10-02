import { FileCode2 } from "lucide-react"

// Decorative, so it's hidden from assistive tech. Line numbers match
// protection.py at the time of writing.
export function AuthShowcase() {
  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-text lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:48px_48px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,black_20%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] rounded-full bg-primary/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-secondary/25 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[460px]">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] font-semibold text-white/70">
          <span className="size-1.5 rounded-full bg-secondary" />
          Every claim cited
        </p>

        <h2 className="mt-6 text-[34px] font-bold leading-[42px] tracking-[-0.02em] text-white">
          Every answer, traced to the exact line.
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-white/60">
          Sign in to index your repositories and ask questions you can verify in
          one click.
        </p>

        <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md animate-fade-up">
          <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3.5 py-2 text-[13px] text-white">
            Where is rate limiting enforced?
          </div>

          <div
            className="mt-4 animate-fade-up text-[13px] leading-[22px] text-white/80"
            style={{ animationDelay: "250ms" }}
          >
            Limits run in a single middleware,{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-white">
              protect()
            </code>
            , so oversized or abusive requests are refused before the body is
            parsed.
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/80">
                <FileCode2 className="size-3.5 text-secondary" />
                app/core/protection.py:153–185
              </span>
              <span className="font-mono text-[11px] text-secondary">
                91% match
              </span>
            </div>
          </div>
        </div>

        <p className="mt-8 font-mono text-[11px] text-white/40">
          Google OAuth 2.0 + PKCE · Supabase Auth
        </p>
      </div>
    </aside>
  )
}
