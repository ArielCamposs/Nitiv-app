import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { PaecDetail } from "@/components/paec/paec-detail"

export default async function PaecDetailPage({
    params,
}: {
    params: { id: string }
}) {
    // Await params object for dynamic route handling
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile || profile.role === "estudiante") redirect("/estudiante")

    const { data: paec } = await supabase
        .from("paec")
        .select(`
      *,
      students (
        name, last_name, rut, birthdate
      ),
      professional_1:users!paec_professional_1_id_fkey ( name, last_name, role ),
      professional_2:users!paec_professional_2_id_fkey ( name, last_name, role ),
      professional_3:users!paec_professional_3_id_fkey ( name, last_name, role )
    `)
        .eq("id", id)
        .eq("institution_id", profile.institution_id)
        .maybeSingle()

    if (!paec) notFound()

    let institutionName: string | undefined
    let institutionLogoUrl: string | undefined
    if (profile.institution_id) {
        const { data: inst } = await supabase
            .from("institutions")
            .select("name, logo_url")
            .eq("id", profile.institution_id)
            .maybeSingle()
        institutionName = inst?.name
        institutionLogoUrl = inst?.logo_url ?? undefined
    }

    const { data: studentRow } = await supabase
        .from("students")
        .select("course_id, courses(name)")
        .eq("id", paec.student_id)
        .maybeSingle()
    const courseName = (studentRow as any)?.courses?.name ?? null

    return (
        <main className="min-h-screen bg-slate-50 print:bg-white">
            <div id="paec-print-area" className="mx-auto max-w-3xl px-4 py-8 print:py-6 print:max-w-none">
                <PaecDetail
                    paec={paec as any}
                    userRole={profile.role}
                    institutionName={institutionName}
                    institutionLogoUrl={institutionLogoUrl}
                    courseName={courseName}
                />
            </div>
        </main>
    )
}
