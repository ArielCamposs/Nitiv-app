import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { StudentsClient } from "@/components/admin/StudentsClient"

export default async function AdminEstudiantesPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users").select("role, institution_id").eq("id", user.id).single()
    if (profile?.role !== "admin") redirect("/")

    const currentYear = new Date().getFullYear()

    const [{ data: students }, { data: courses }, { data: yearRows }] = await Promise.all([
        supabase
            .from("students")
            .select("id, name, last_name, rut, birthdate, guardian_name, guardian_phone, guardian_email, course_id, active, created_at")
            .eq("institution_id", profile.institution_id)
            .order("last_name"),
        supabase
            .from("courses")
            .select("id, name, level, section, year")
            .eq("institution_id", profile.institution_id)
            .eq("active", true)
            .order("name"),
        supabase
            .from("courses")
            .select("year")
            .eq("institution_id", profile.institution_id)
            .order("year", { ascending: false }),
    ])

    const availableYears = [...new Set((yearRows ?? []).map(c => c.year))].filter(Boolean) as number[]

    return (
        <div className="px-6 py-8 max-w-5xl mx-auto">
            <StudentsClient
                students={students ?? []}
                courses={courses ?? []}
                institutionId={profile.institution_id}
                currentYear={currentYear}
                availableYears={availableYears}
            />
        </div>
    )
}
