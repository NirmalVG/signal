import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/session"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Run on pages and route handlers, skip static assets and images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
