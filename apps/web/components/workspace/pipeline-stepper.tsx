import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RepoStatus } from "@/lib/api/types"

type StepState = "done" | "active" | "pending" | "failed"

const STEPS = ["Upload", "Extract", "Index", "Ready"] as const

// Backend status → the state of each of the four steps.
// By the time the client can poll, the upload has finished, so step 1 is
// always done. A repo that reaches "failed" here failed during indexing:
// extraction errors are returned to the uploader as an HTTP error instead.
const PROGRESS: Record<Exclude<RepoStatus, "indexed">, StepState[]> = {
  processing: ["done", "active", "pending", "pending"],
  extracted: ["done", "done", "active", "pending"],
  indexing: ["done", "done", "active", "pending"],
  failed: ["done", "done", "failed", "pending"],
}

const COPY: Record<
  Exclude<RepoStatus, "indexed">,
  { title: string; body: string }
> = {
  processing: {
    title: "Unpacking your repository",
    body: "Safely extracting files and checking every path.",
  },
  extracted: {
    title: "Queued for indexing",
    body: "Your files are ready. Indexing is about to begin.",
  },
  indexing: {
    title: "Indexing your codebase",
    body: "Splitting code into meaningful chunks and generating embeddings so questions can be answered with real citations.",
  },
  failed: {
    title: "Indexing failed",
    body: "Something went wrong while indexing this repository. Try uploading the archive again.",
  },
}

function StepDot({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] font-mono text-[11px] font-semibold transition-colors duration-300",
        state === "done" && "border-secondary bg-secondary text-white",
        state === "active" &&
          "animate-pulse border-primary bg-surface text-primary shadow-focus-halo",
        state === "pending" &&
          "border-border-strong bg-surface text-text-faint",
        state === "failed" && "border-error bg-error text-white",
      )}
    >
      {state === "done" ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : state === "failed" ? (
        <X className="size-3.5" strokeWidth={3} />
      ) : (
        index + 1
      )}
    </span>
  )
}

export function PipelineStepper({
  status,
  repoName,
}: {
  status: Exclude<RepoStatus, "indexed">
  repoName: string
}) {
  const states = PROGRESS[status]
  const copy = COPY[status]

  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-border bg-surface p-6 shadow-level-1"
    >
      <p className="truncate font-mono text-xs text-text-muted">{repoName}</p>

      <ol className="mt-5 flex items-center" aria-label="Indexing progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={states[i] === "active" ? "step" : undefined}
            className={cn(
              "flex items-center",
              i < STEPS.length - 1 && "flex-1",
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <StepDot state={states[i]} index={i} />
              <span
                className={cn(
                  "font-mono text-[11px] font-medium uppercase tracking-[0.04em]",
                  states[i] === "pending" ? "text-text-faint" : "text-text",
                )}
              >
                {label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              // Connector: a grey track with a teal fill that grows once the
              // step to its left is done.
              <span className="relative mx-2 mb-6 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 bg-secondary transition-[width] duration-500 ease-out",
                    states[i] === "done" ? "w-full" : "w-0",
                  )}
                />
              </span>
            )}
          </li>
        ))}
      </ol>

      <h2 className="mt-6 text-base font-semibold">{copy.title}</h2>
      <p className="mt-1 max-w-[52ch] text-sm leading-[22px] text-text-muted">
        {copy.body}
      </p>
    </section>
  )
}
