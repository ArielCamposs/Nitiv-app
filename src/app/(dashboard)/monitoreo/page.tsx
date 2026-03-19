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

    // Obtener los casos existentes
    const { data: casos } = await supabase
        .from("student_cases")
        .select(`
            id,
            reason,
            initial_state,
            next_step,
            next_step_date,
            status,
            created_at,
            students (id, name, last_name, courses(name, section)),
            creador:users!created_by (id, name, last_name, role),
            responsable:users!responsable_id (id, name, last_name, role),
            actions: student_case_actions (action_type)
        `)
        .eq("institution_id", profile.institution_id)
        .order("created_at", { ascending: false })

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
