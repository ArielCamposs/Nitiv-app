import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { CasoDetailClient } from "@/components/casos/caso-detail-client"
import { BackButton } from "@/components/ui/back-button"
import { CloseCaseButton } from "@/components/casos/close-case-button"

/** PostgREST: columna aún no en caché / no existe (migración pendiente). */
function isMissingParticipantColumnError(err: { message?: string; code?: string } | null): boolean {
    const msg = (err?.message ?? "").toLowerCase()
    if (err?.code === "PGRST204") return true
    return msg.includes("participant_student_ids") && (msg.includes("column") || msg.includes("schema cache"))
}

export default async function MonitoreoDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return redirect("/login")

    // Solo roles autorizados
    const { data: profile } = await supabase
        .from("users")
        .select("role, institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return redirect("/login")

    const { data: caso, error: casoError } = await supabase
        .from("student_cases")
        .select(`
            id, reason, initial_state, status, next_step, next_step_date, created_at, created_by, responsable_id,
            when_occurs, frequency, derived_to, convivencia_record_id,
            students (id, name, last_name, courses(name, section)),
            creador:users!created_by (name, last_name, role),
            responsable:users!responsable_id (name, last_name, role)
        `)
        .eq("id", id)
        .eq("institution_id", profile.institution_id)
        .maybeSingle()

    if (casoError) {
        console.error("ERROR FETCHING CASO", casoError)
    }

    if (!caso) {
        console.error("CASO NOT FOUND PARA ID:", id)
        return notFound()
    }

    // Regla docente: solo puede ver casos que él/ella derivó.
    if (profile.role === "docente" && caso.created_by !== user.id) {
        return notFound()
    }

    let actions: any[] = []
    if (profile.role !== "docente") {
        const selectWithParticipants = `
            id, action_type, description, created_at, participant_student_ids,
            users (name, last_name, role)
        `
        const selectLegacy = `
            id, action_type, description, created_at,
            users (name, last_name, role)
        `

        let { data: loadedActions, error: actError } = await supabase
            .from("student_case_actions")
            .select(selectWithParticipants)
            .eq("case_id", id)
            .order("created_at", { ascending: false })

        if (actError) {
            const retry =
                isMissingParticipantColumnError(actError) ||
                !(String((actError as { message?: string }).message ?? "").trim())
            if (retry) {
                const second = await supabase
                    .from("student_case_actions")
                    .select(selectLegacy)
                    .eq("case_id", id)
                    .order("created_at", { ascending: false })
                if (!second.error) {
                    loadedActions = second.data
                    actError = null
                } else {
                    actError = second.error
                }
            }
        }

        if (actError) {
            const e = actError as { message?: string; code?: string; details?: string; hint?: string }
            console.error(
                "ERROR FETCHING ACTIONS",
                e.message ?? "(sin mensaje)",
                e.code ?? "",
                e.details ?? "",
                e.hint ?? ""
            )
        }
        actions = loadedActions ?? []
    }

    let convivenciaRecord: any = null
    if (caso?.convivencia_record_id) {
        const { data } = await supabase
            .from("convivencia_records")
            .select(
                "id, type, event_title, severity, location, description, agreements, actions_taken, incident_date, status, resolved, resolution_notes, convivencia_record_students(student_id, students(id, name, last_name, course_id, course:course_id(name, section)))"
            )
            .eq("id", caso.convivencia_record_id)
            .maybeSingle()
        convivenciaRecord = data
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div>
                    <BackButton
                        fallbackHref="/monitoreo"
                        label="Atrás"
                        className="mb-4 -ml-3 text-slate-500 hover:text-slate-900"
                    />
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Detalle de Derivación
                        </h1>
                        {profile.role !== "docente" && caso.status !== "cerrado" && (
                            <CloseCaseButton caseId={caso.id} userId={user.id} />
                        )}
                    </div>
                </div>

                <CasoDetailClient 
                    caso={caso} 
                    initialActions={actions} 
                    userId={user.id} 
                    userRole={profile.role}
                    convivenciaRecord={convivenciaRecord}
                />
            </div>
        </main>
    )
}
