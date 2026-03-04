import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
                    catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json("No user")

    const { data: profile } = await supabase
        .from("users")
        .select("id, role, institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return NextResponse.json("No profile")

    const { data: allActivities, error } = await supabase
        .from("activities")
        .select(`id, title, target, origin, active`)
        .eq("institution_id", profile.institution_id)

    if (error) return NextResponse.json(error)

    return NextResponse.json({ allActivities })
}
