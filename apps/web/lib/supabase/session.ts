import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1) Update the incoming request, so Server Components rendered
          //    later in THIS request see the fresh token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // 2) Rebuild the response from the updated request...
          response = NextResponse.next({ request })
          // 3) ...and set the cookies on it, so the BROWSER stores them.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Don't put any code between createServerClient and this call.
  // If the access token is expired, this is what triggers the refresh.
  await supabase.auth.getClaims()

  return response
}
