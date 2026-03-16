import { createClient } from "@/lib/supabase/server"
import { DecForm } from "@/components/dec/dec-form"

async function getFormData() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return null

    const { data: students } = await supabase
        .from("students")
        .select("id, name, last_name, birthdate, guardian_name, guardian_phone, course_id, courses(id, name, section)")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .order("last_name")

    // Profesor jefe por curso (para auto-completar al seleccionar estudiante)
    const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
    const courseIds = (courses ?? []).map((c: { id: string }) => c.id)

    const headTeacherByCourse: Record<string, string> = {}
    if (courseIds.length > 0) {
        const { data: headTeachers } = await supabase
            .from("course_teachers")
            .select("course_id, users!teacher_id(name, last_name)")
            .eq("is_head_teacher", true)
            .in("course_id", courseIds)
        for (const ht of headTeachers ?? []) {
            const u = (ht as any).users
            const name = u ? `${u.name ?? ""} ${u.last_name ?? ""}`.trim() : ""
            headTeacherByCourse[(ht as any).course_id] = name || "—"
        }
    }

    // Profesionales del establecimiento (para Encargado, Acompañante interno/externo)
    const { data: professionals } = await supabase
        .from("users")
        .select("id, name, last_name, role")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .in("role", ["docente", "dupla", "convivencia", "director", "inspector", "utp", "admin"])
        .order("last_name")

    return {
        students: students ?? [],
        headTeacherByCourse,
        professionals: professionals ?? [],
        teacherId: profile.id,
        institutionId: profile.institution_id,
    }
}

export default async function NuevoDecPage() {
    const data = await getFormData()
    if (!data) return <div>No se pudo cargar el formulario.</div>

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Nuevo caso DEC
                    </h1>
                    <p className="text-sm text-slate-500">
                        Registro de Desregulación Emocional y Conductual
                    </p>
                </div>

                <DecForm
                    students={data.students as any}
                    headTeacherByCourse={data.headTeacherByCourse}
                    professionals={data.professionals as any}
                    teacherId={data.teacherId}
                    institutionId={data.institutionId}
                />
            </div>
        </main>
    )
}
