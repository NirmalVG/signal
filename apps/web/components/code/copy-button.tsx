"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  // Never leave a timer running after the component unmounts.
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      // Async Clipboard API: needs a secure context (https or localhost).
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Permission denied or insecure context — fail quietly, nothing to undo.
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" aria-label={label} onClick={copy}>
        {copied ? <Check className="text-secondary" /> : <Copy />}
      </Button>
      {/* Screen readers can't see the icon swap, so announce it. */}
      <span role="status" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </>
  )
}
