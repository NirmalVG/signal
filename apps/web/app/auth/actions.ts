"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signOut() {
  const supabase = await createClient()
  // "local" ends only this browser's session. The default scope is
  // "global", which would also log you out on your phone and other devices.
  await supabase.auth.signOut({ scope: "local" })
  redirect("/")
}
