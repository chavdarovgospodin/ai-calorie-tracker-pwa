import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Redirect logged-in users away from auth pages
  if (user && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Allow unauthenticated access to auth pages
  if (!user && (path === '/login' || path === '/register')) {
    return supabaseResponse
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check onboarding completion. Prefer the flag mirrored into the JWT
  // (user_metadata) so the common case costs no extra round-trip; only fall
  // back to a DB read for older profiles that predate the mirror.
  let onboardingCompleted = user.user_metadata?.onboarding_completed as
    | boolean
    | undefined
  if (onboardingCompleted === undefined) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()
    onboardingCompleted = profile?.onboarding_completed ?? false
  }

  // Redirect completed users away from onboarding
  if (path === '/onboarding' && onboardingCompleted) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Allow onboarding page for users who haven't completed it
  if (path === '/onboarding') {
    return supabaseResponse
  }

  if (!onboardingCompleted) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.*\\.png|apple-touch-icon\\.png|api/|auth/callback).*)'],
}
