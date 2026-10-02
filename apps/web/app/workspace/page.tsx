import type { Metadata } from "next"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { getAuthUser } from "@/lib/auth/user"

export const metadata: Metadata = {
  title: "Workspace — Signal",
}

export default async function WorkspacePage() {
  const user = await getAuthUser()
  return <WorkspaceShell user={user} />
}
