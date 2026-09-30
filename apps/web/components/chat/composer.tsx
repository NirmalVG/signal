"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"

const MAX_HEIGHT_PX = 160

// Reads the platform without a hydration mismatch: the server snapshot is
// always `false`, and React re-renders with the real value after hydrating.
const subscribe = () => () => {}
const getIsApple = () => /Mac|iPhone|iPad/.test(navigator.userAgent)
const getServerIsApple = () => false

export function Composer({
  disabled,
  placeholder,
  onSend,
}: {
  disabled: boolean
  placeholder: string
  onSend: (question: string) => void
}) {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)
  const isApple = useSyncExternalStore(subscribe, getIsApple, getServerIsApple)

  // Auto-grow: collapse to 'auto' first so scrollHeight re-measures the
  // content (otherwise the box could never shrink), then cap the height.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  // ⌘K / Ctrl+K focuses the composer from anywhere — this is what the
  // keyboard glyph on the right promises.
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const canSend = !disabled && value.trim().length > 0

  function submit() {
    if (!canSend) return
    onSend(value.trim())
    setValue("")
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: while typing with an IME (Malayalam, Hindi, Japanese…),
    // Enter confirms the candidate word — it must NOT send the message.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div>
      {/* DESIGN.md "Codebase Query Input": 1.5px border, 16px radius,
          16×20 padding, indigo border + halo on focus */}
      <div className="flex items-end gap-3 rounded-lg border-[1.5px] border-border bg-surface px-5 py-4 transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:shadow-focus-halo">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Ask a question about this codebase"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-6 flex-1 resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-text-faint disabled:cursor-not-allowed"
        />

        <kbd className="hidden shrink-0 self-center rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] font-medium text-text-muted md:inline-block">
          {isApple ? "⌘K" : "Ctrl K"}
        </kbd>

        <Button
          size="icon"
          aria-label="Send question"
          disabled={!canSend}
          onClick={submit}
        >
          <ArrowUp />
        </Button>
      </div>

      <p className="mt-2 hidden px-1 font-mono text-[11px] text-text-faint md:block">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  )
}
