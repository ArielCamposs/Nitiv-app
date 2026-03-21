import { createClient } from "@/lib/supabase/server"
import { CasosPageContent } from "@/components/casos/casos-page-content"

export default async function MonitoreoPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>No autenticado</div>

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role, name, last_name")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return <div>Error cargando perfil</div>

    // Permite roles de docencia y gestión
    const allowedRoles = ["dupla", "convivencia", "docente", "director", "inspector", "utp", "admin"]
    if (!allowedRoles.includes(profile.role)) {
        return <div>No tienes acceso a este módulo.</div>
    }

    // Obtener los estudiantes activos para el buscador del modal
    const { data: students } = await supabase
        .from("students")
        .select("id, name, last_name, courses(name, section)")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .order("last_name")

    let baseCasesQuery = supabase
        .from("student_cases")
        .select("id, student_id, created_by, reason, initial_state, next_step, next_step_date, status, responsable_id, created_at, convivencia_record_id")
        .eq("institution_id", profile.institution_id)

    // Docente: solo ve los casos que él/ella derivó.
    if (profile.role === "docente") {
        baseCasesQuery = baseCasesQuery.eq("created_by", user.id)
    }

    const { data: baseCases, error: baseCasesError } = await baseCasesQuery
        .order("created_at", { ascending: false })

    if (baseCasesError) {
        console.error("Error cargando casos en monitoreo:", baseCasesError)
    }

    const studentIds = Array.from(new Set((baseCases ?? []).map((c) => c.student_id).filter(Boolean)))
    const userIds = Array.from(
        new Set(
            (baseCases ?? [])
                .flatMap((c) => [c.created_by, c.responsable_id])
                .filter(Boolean)
        )
    )
    const caseIds = (baseCases ?? []).map((c) => c.id)

    const { data: caseStudents } = studentIds.length
        ? await supabase
            .from("students")
            .select("id, name, last_name, courses(name, section)")
            .in("id", studentIds)
        : { data: [] as any[] }

    const { data: caseUsers } = userIds.length
        ? await supabase
            .from("users")
            .select("id, name, last_name, role")
            .in("id", userIds)
        : { data: [] as any[] }

    const { data: caseActions } = caseIds.length
        ? await supabase
            .from("student_case_actions")
            .select("case_id, action_type")
            .in("case_id", caseIds)
        : { data: [] as any[] }

    const studentsById = new Map((caseStudents ?? []).map((s: any) => [s.id, s]))
    const usersById = new Map((caseUsers ?? []).map((u: any) => [u.id, u]))
    const actionsByCaseId = new Map<string, any[]>()

    for (const action of caseActions ?? []) {
        const list = actionsByCaseId.get(action.case_id) ?? []
        list.push(action)
        actionsByCaseId.set(action.case_id, list)
    }

    const convivenciaIds = [
        ...new Set(
            (baseCases ?? [])
                .map((c: any) => c.convivencia_record_id)
                .filter(Boolean)
        ),
    ]

    const { data: convivenciaRecords } =
        convivenciaIds.length > 0
            ? await supabase
                  .from("convivencia_records")
                  .select(
                      "id, type, event_title, severity, location, description, agreements, actions_taken, incident_date, status, convivencia_record_students(student_id, students(id, name, last_name, course_id, course:course_id(name, section)))"
                  )
                  .in("id", convivenciaIds)
            : { data: [] as any[] }

    const convivenciaById = new Map((convivenciaRecords ?? []).map((r: any) => [r.id, r]))

    const casos = (baseCases ?? []).map((c: any) => ({
        ...c,
        students: studentsById.get(c.student_id) ?? null,
        creador: usersById.get(c.created_by) ?? null,
        responsable: c.responsable_id ? usersById.get(c.responsable_id) ?? null : null,
        actions: actionsByCaseId.get(c.id) ?? [],
        convivenciaRecord: c.convivencia_record_id ? convivenciaById.get(c.convivencia_record_id) ?? null : null,
    }))

    // Obtener profesionales para asignar como responsable
    const { data: professionals } = await supabase
        .from("users")
        .select("id, name, last_name, role")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .in("role", ["docente", "dupla", "convivencia", "director", "inspector", "utp", "admin"])
        .order("last_name")

    return (
        <main className="min-h-screen bg-slate-50">
            <CasosPageContent
                casos={casos ?? []}
                students={students ?? []}
                professionals={professionals ?? []}
                institutionId={profile.institution_id}
                userId={user.id}
                userRole={profile.role}
                userName={`${profile.name} ${profile.last_name}`}
            />
        </main>
    )
}
