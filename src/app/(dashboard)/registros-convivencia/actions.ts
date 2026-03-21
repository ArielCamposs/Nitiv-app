"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/** PostgREST suele responder así si la columna aún no existe en la BD remota. */
function isMissingEventTitleColumnError(err: { message?: string } | null): boolean {
    const msg = (err?.message ?? "").toLowerCase()
    return msg.includes("event_title") && (msg.includes("column") || msg.includes("schema cache"))
}

export async function createConvivenciaRecord(formData: {
    status: string
    event_title: string
    responsable_id: string | null
    apoyo_id: string | null
    type: string
    severity: string
    location: string
    description: string
    agreements: string
    involved_count: number
    student_ids: string[]
    actions_taken: string[]
    incident_date: string
    next_step?: string | null
    next_step_date?: string | null
    derived_to?: string[] | null
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autorizado" }

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id) return { error: "Sin institución" }
    if (["estudiante", "centro_alumnos", "admin", "docente"].includes(profile.role)) {
        return { error: "Rol no autorizado" }
    }

    const baseInsert = {
        institution_id: profile.institution_id,
        reporter_id: user.id,
        status: formData.status,
        responsable_id: formData.responsable_id || null,
        apoyo_id: formData.apoyo_id || null,
        type: formData.type,
        severity: formData.severity,
        location: formData.location || null,
        description: formData.description,
        agreements: formData.agreements || null,
        involved_count: Math.max(formData.involved_count, formData.student_ids.length || 1),
        courses_involved: [], // legacy field, kept empty
        actions_taken: formData.actions_taken,
        incident_date: formData.incident_date || new Date().toISOString(),
    }

    let { data: record, error } = await supabase
        .from("convivencia_records")
        .insert({
            ...baseInsert,
            event_title: formData.event_title?.trim() || null,
        })
        .select("id")
        .single()

    if (error && isMissingEventTitleColumnError(error)) {
        ;({ data: record, error } = await supabase
            .from("convivencia_records")
            .insert(baseInsert)
            .select("id")
            .single())
    }

    if (error) return { error: error.message }

    // Link students to the record
    if (formData.student_ids.length > 0) {
        await supabase.from("convivencia_record_students").insert(
            formData.student_ids.map(sid => ({ record_id: record.id, student_id: sid }))
        )
    }

    // Si estado es seguimiento, crear casos en gestión de casos (uno por estudiante involucrado)
    const statusToSave = formData.status === "cerrado" ? "cerrado" : "seguimiento"
    if (statusToSave === "seguimiento" && formData.student_ids.length > 0) {
        try {
            const severity = (formData.severity || "").toLowerCase()
            const initialState =
                severity === "grave" || severity === "gravisimo"
                    ? "urgente"
                    : severity === "moderada"
                      ? "observacion"
                      : "estable"

            const reason =
                (formData.event_title?.trim() || formData.type || "Registro de convivencia") +
                (formData.description?.trim() ? `\n\n${formData.description.trim().slice(0, 500)}` : "")

            const nextStepDateValue = formData.next_step_date
                ? (formData.next_step_date.includes("T")
                    ? formData.next_step_date.slice(0, 10)
                    : formData.next_step_date)
                : null

            const caseRows = formData.student_ids.map((student_id) => {
                const row: Record<string, unknown> = {
                    institution_id: profile.institution_id,
                    student_id,
                    created_by: user.id,
                    reason,
                    initial_state: initialState,
                    status: "en_proceso",
                    responsable_id: formData.responsable_id || null,
                    convivencia_record_id: record.id,
                    next_step: formData.next_step?.trim() || null,
                    next_step_date: nextStepDateValue,
                }
                return row
            })

            const { error: casesError } = await supabase.from("student_cases").insert(caseRows)
            if (casesError) throw casesError
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : "Error al crear casos"
            revalidatePath("/registros-convivencia")
            revalidatePath("/monitoreo")
            return { success: true, id: record.id, warning: `Registro guardado, pero no se crearon los casos en Gestión de casos: ${msg}` }
        }
    }

    revalidatePath("/registros-convivencia")
    revalidatePath("/monitoreo")
    return { success: true, id: record.id }
}

export async function updateConvivenciaRecord(id: string, formData: {
    status: string
    event_title: string
    responsable_id: string | null
    apoyo_id: string | null
    type: string
    severity: string
    location: string
    description: string
    agreements: string
    involved_count: number
    student_ids: string[]
    actions_taken: string[]
    incident_date: string
    next_step?: string | null
    next_step_date?: string | null
    derived_to?: string[] | null
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autorizado" }

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id) return { error: "Sin institución" }
    if (["estudiante", "centro_alumnos", "admin", "docente"].includes(profile.role)) {
        return { error: "Rol no autorizado" }
    }

    const baseUpdate = {
        status: formData.status,
        responsable_id: formData.responsable_id || null,
        apoyo_id: formData.apoyo_id || null,
        type: formData.type,
        severity: formData.severity,
        location: formData.location || null,
        description: formData.description,
        agreements: formData.agreements || null,
        involved_count: Math.max(formData.involved_count, formData.student_ids.length || 1),
        actions_taken: formData.actions_taken,
        incident_date: formData.incident_date || new Date().toISOString(),
    }

    let { error } = await supabase
        .from("convivencia_records")
        .update({
            ...baseUpdate,
            event_title: formData.event_title?.trim() || null,
        })
        .eq("id", id)

    if (error && isMissingEventTitleColumnError(error)) {
        ;({ error } = await supabase.from("convivencia_records").update(baseUpdate).eq("id", id))
    }

    if (error) return { error: error.message }

    const statusToSave = formData.status === "cerrado" ? "cerrado" : "seguimiento"

    // Si se cierra el registro de convivencia, cerrar los casos de gestión vinculados
    if (statusToSave === "cerrado") {
        await supabase
            .from("student_cases")
            .update({ status: "cerrado" })
            .eq("convivencia_record_id", id)
    }

    // Si pasa a seguimiento y aún no hay casos creados, crearlos
    if (statusToSave === "seguimiento" && formData.student_ids.length > 0) {
        const { data: existing } = await supabase
            .from("student_cases")
            .select("id")
            .eq("convivencia_record_id", id)
            .limit(1)
            .maybeSingle()

        if (!existing && profile?.institution_id) {
            try {
                const severity = (formData.severity || "").toLowerCase()
                const initialState =
                    severity === "grave" || severity === "gravisimo"
                        ? "urgente"
                        : severity === "moderada"
                          ? "observacion"
                          : "estable"
                const reason =
                    (formData.event_title?.trim() || formData.type || "Registro de convivencia") +
                    (formData.description?.trim() ? `\n\n${formData.description.trim().slice(0, 500)}` : "")
                const nextStepDateValue = formData.next_step_date
                    ? (formData.next_step_date.includes("T") ? formData.next_step_date.slice(0, 10) : formData.next_step_date)
                    : null

                const caseRows = formData.student_ids.map((student_id) => ({
                    institution_id: profile.institution_id,
                    student_id,
                    created_by: user.id,
                    reason,
                    initial_state: initialState,
                    status: "en_proceso",
                    responsable_id: formData.responsable_id || null,
                    convivencia_record_id: id,
                    next_step: formData.next_step?.trim() || null,
                    next_step_date: nextStepDateValue,
                }))
                const { error: casesError } = await supabase.from("student_cases").insert(caseRows)
                if (casesError) throw casesError
            } catch {
                // Casos no creados; el registro de convivencia ya se actualizó
            }
        }
    }

    // Update students relations
    // 1. Delete existing
    await supabase.from("convivencia_record_students").delete().eq("record_id", id)

    // 2. Insert new
    if (formData.student_ids.length > 0) {
        await supabase.from("convivencia_record_students").insert(
            formData.student_ids.map(sid => ({ record_id: id, student_id: sid }))
        )
    }

    revalidatePath("/registros-convivencia")
    revalidatePath("/monitoreo")
    return { success: true }
}

export async function resolveConvivenciaRecord(id: string, resolutionNotes: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autorizado" }

    const { error } = await supabase
        .from("convivencia_records")
        .update({ resolved: true, resolution_notes: resolutionNotes, status: "cerrado" })
        .eq("id", id)

    if (error) return { error: error.message }

    await supabase
        .from("student_cases")
        .update({ status: "cerrado" })
        .eq("convivencia_record_id", id)

    revalidatePath("/registros-convivencia")
    revalidatePath("/monitoreo")
    return { success: true }
}
