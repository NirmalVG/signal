import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge resolves conflicts ("p-2 p-4" → "p-4") but only knows
// Tailwind's built-in names. Our custom shadow tokens (shadow-level-1 …)
// must be registered, or it mistakes them for shadow *colors* and drops
// one of two legitimately different shadows.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [
        {
          shadow: [
            "level-1",
            "level-2",
            "level-3",
            "primary-glow",
            "focus-halo",
            "node-glow",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
