import { createClient } from "@/lib/supabase/server"
import { ClimaPageTabs } from "@/components/teacher/clima-page-tabs"
import { redirect } from "next/navigation"

async function getTeacherCourses() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return null

    // Admin cannot access the climate page
    if (profile.role === "admin") return redirect("/")

    const { data: courses } = await supabase
        .from("course_teachers")
        .select("course_id, is_head_teacher, courses(id, name, level)")
        .eq("teacher_id", user.id)

    const courseIds = (courses ?? []).map((c: any) => c.course_id)

    // 28 días para el resumen
    const since28 = new Date()
    since28.setDate(since28.getDate() - 28)

    // 90 días para el historial
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)

    const { data: teacherLogs } = await supabase
        .from("teacher_logs")
        .select("course_id, energy_level, log_date")
        .in("course_id", courseIds)
        .eq("teacher_id", user.id)
        .gte("log_date", since28.toISOString().split("T")[0])
        .order("log_date", { ascending: false })

    // Logs históricos (90 días, para el gráfico)
    const { data: historyLogs } = await supabase
        .from("teacher_logs")
        .select("course_id, energy_level, log_date")
        .in("course_id", courseIds)
        .eq("teacher_id", user.id)
        .gte("log_date", since90.toISOString().split("T")[0])
        .order("log_date", { ascending: true })

    return {
        teacherId: profile.id,
        institutionId: profile.institution_id,
        courses: courses ?? [],
        teacherLogs: teacherLogs ?? [],
        historyLogs: historyLogs ?? [],
    }
}

export default async function ClimaPage() {
    const data = await getTeacherCourses()
    if (!data) return <div>No se encontró tu perfil docente.</div>

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Clima de aula</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Estadísticas de tus cursos
                    </p>
                </div>

                {data.courses.length === 0 ? (
                    <p className="text-slate-500">
                        Aún no tienes cursos asignados. Solicita al administrador que te asigne uno.
                    </p>
                ) : (
                    <ClimaPageTabs
                        teacherId={data.teacherId}
                        institutionId={data.institutionId}
                        courses={data.courses}
                        teacherLogs={data.teacherLogs}
                        historyLogs={data.historyLogs}
                    />
                )}
            </div>
        </main>
    )
}
