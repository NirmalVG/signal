import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Supabase sends the browser here after Google login:
//   /auth/callback?code=<one-time code>
// (or ?error=access_denied&error_description=... if the user said no)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const providerError = searchParams.get("error")

  if (code && !providerError) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) return redirectTo(request, "/workspace")
    console.error("[auth/callback] code exchange failed:", error.message)
  }

  return redirectTo(request, "/login", "?error=auth_failed")
}

// Build the redirect from the incoming URL so it works on localhost,
// preview deployments and production without hard-coding a domain.
function redirectTo(request: NextRequest, pathname: string, search = "") {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = search
  return NextResponse.redirect(url)
}
