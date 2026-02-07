import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Setup Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 2. Refresh Session
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 3. Protected Routes Logic
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isLoginPage = request.nextUrl.pathname.startsWith('/login')

    if (isDashboard && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isLoginPage && user) {
        // If user is already logged in, we might want to redirect them to their dashboard
        // But we don't know their role easily in middleware without a DB call (expensive).
        // For now, let them access login or redirect to a generic dashboard.
        // Let's redirect to specific dashboards if we can, or just /dashboard/student as default?
        // Safer to let them stay or redirect to home.
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
