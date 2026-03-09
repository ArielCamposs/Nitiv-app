"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createConvivenciaRecord(formData: {
    status: string
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
    if (["estudiante", "centro_alumnos", "admin"].includes(profile.role)) {
        return { error: "Rol no autorizado" }
    }

    const { data: record, error } = await supabase
        .from("convivencia_records")
        .insert({
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
            courses_involved: [],           // legacy field, kept empty
            actions_taken: formData.actions_taken,
            incident_date: formData.incident_date || new Date().toISOString(),
        })
        .select("id")
        .single()

    if (error) return { error: error.message }

    // Link students to the record
    if (formData.student_ids.length > 0) {
        await supabase.from("convivencia_record_students").insert(
            formData.student_ids.map(sid => ({ record_id: record.id, student_id: sid }))
        )
    }

    revalidatePath("/registros-convivencia")
    return { success: true, id: record.id }
}

export async function updateConvivenciaRecord(id: string, formData: {
    status: string
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
    if (["estudiante", "centro_alumnos", "admin"].includes(profile.role)) {
        return { error: "Rol no autorizado" }
    }

    const { error } = await supabase
        .from("convivencia_records")
        .update({
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
        })
        .eq("id", id)

    if (error) return { error: error.message }

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

    revalidatePath("/registros-convivencia")
    return { success: true }
}
