import type { Metadata } from "next"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"

export const metadata: Metadata = {
  title: "Workspace — Signal",
}

export default function WorkspacePage() {
  return <WorkspaceShell />
}
