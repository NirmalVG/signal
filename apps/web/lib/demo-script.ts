// Timeline for the hero demo. A PURE function of elapsed time: given "how many
// ms since the loop started", it says what the screen should show. Pure
// functions are trivial to test and can't drift out of sync like a chain of
// setTimeouts can.
export type DemoPhase = "typing" | "thinking" | "answer"

export const TYPE_MS_PER_CHAR = 32
const PAUSE_AFTER_TYPING_MS = 450
const THINKING_MS = 1500
const READING_MS = 7000

export function frameAt(
  elapsedMs: number,
  questionLength: number,
): { phase: DemoPhase; chars: number } {
  const typingEnd = questionLength * TYPE_MS_PER_CHAR
  const thinkingStart = typingEnd + PAUSE_AFTER_TYPING_MS
  const answerStart = thinkingStart + THINKING_MS
  const loopLength = answerStart + READING_MS

  const t = elapsedMs % loopLength // wrap around: the demo loops forever

  if (t < typingEnd) {
    return { phase: "typing", chars: Math.floor(t / TYPE_MS_PER_CHAR) + 1 }
  }
  if (t < thinkingStart) return { phase: "typing", chars: questionLength }
  if (t < answerStart) return { phase: "thinking", chars: questionLength }
  return { phase: "answer", chars: questionLength }
}
