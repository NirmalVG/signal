import { create } from "zustand"
import type { Citation } from "@/lib/api/types"

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string
      role: "assistant"
      status: "pending" | "done" | "error"
      content: string
      context: Citation[]
      confidence: number
      latencyMs: number
    }

// A stable reference for "no messages". Selectors must return the SAME
// object when nothing changed — `?? []` would create a new array on every
// call and Zustand v5 would re-render forever.
const NO_MESSAGES: ChatMessage[] = []

interface WorkspaceState {
  activeRepoId: string | null
  messagesByRepo: Record<string, ChatMessage[]>
  selectedCitation: Citation | null
  sidebarCollapsed: boolean
  mobileNavOpen: boolean

  setActiveRepo: (repoId: string | null) => void
  addMessage: (repoId: string, message: ChatMessage) => void
  updateMessage: (
    repoId: string,
    messageId: string,
    patch: Partial<ChatMessage>,
  ) => void
  clearConversation: (repoId: string) => void
  selectCitation: (citation: Citation | null) => void
  toggleSidebar: () => void
  setMobileNav: (open: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  activeRepoId: null,
  messagesByRepo: {},
  selectedCitation: null,
  sidebarCollapsed: false,
  mobileNavOpen: false,

  setActiveRepo: (repoId) =>
    // Switching repos closes the drawer: a citation from repo A must not
    // stay open while you're looking at repo B.
    set({ activeRepoId: repoId, selectedCitation: null, mobileNavOpen: false }),

  addMessage: (repoId, message) =>
    set((s) => ({
      messagesByRepo: {
        ...s.messagesByRepo,
        [repoId]: [...(s.messagesByRepo[repoId] ?? []), message],
      },
    })),

  updateMessage: (repoId, messageId, patch) =>
    set((s) => ({
      messagesByRepo: {
        ...s.messagesByRepo,
        [repoId]: (s.messagesByRepo[repoId] ?? []).map((m) =>
          m.id === messageId ? ({ ...m, ...patch } as ChatMessage) : m,
        ),
      },
    })),

  clearConversation: (repoId) =>
    set((s) => {
      const rest = { ...s.messagesByRepo }
      delete rest[repoId]
      return { messagesByRepo: rest, selectedCitation: null }
    }),

  selectCitation: (citation) => set({ selectedCitation: citation }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNav: (open) => set({ mobileNavOpen: open }),
}))

// Selector helper: components subscribe to ONE repo's thread, so a new
// message in repo A doesn't re-render a component showing repo B.
export const useMessages = (repoId: string | null) =>
  useWorkspaceStore((s) =>
    repoId ? (s.messagesByRepo[repoId] ?? NO_MESSAGES) : NO_MESSAGES,
  )
