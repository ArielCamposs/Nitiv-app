"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type RadarPeriod = "inicio_s1" | "termino_s1" | "inicio_s2" | "termino_s2"

export async function toggleRadarSession(
    courseId: string,
    period: RadarPeriod,
    activate: boolean,
    institutionId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (!profile || !["dupla", "convivencia"].includes(profile.role)) {
        return { success: false, error: "Sin permisos para esta acción" }
    }

    if (activate) {
        const { error } = await supabase.from("radar_sessions").upsert(
            {
                institution_id: institutionId,
                course_id: courseId,
                period,
                created_by: user.id,
                active: true,
                activated_at: new Date().toISOString(),
                deactivated_at: null,
            },
            { onConflict: "institution_id,course_id,period" }
        )
        if (error) return { success: false, error: error.message }
    } else {
        const { error } = await supabase
            .from("radar_sessions")
            .update({ active: false, deactivated_at: new Date().toISOString() })
            .eq("institution_id", institutionId)
            .eq("course_id", courseId)
            .eq("period", period)
        if (error) return { success: false, error: error.message }
    }

    revalidatePath("/dupla/radar")
    revalidatePath("/convivencia/radar")
    return { success: true }
}

export async function getRadarSessionSummary(sessionId: string): Promise<{
    success: boolean
    data?: {
        activatedAt: string
        responseCount: number
        avgByAxis: Partial<Record<string, number>>
        courseName: string
        period: string
    }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { data: session } = await supabase
        .from("radar_sessions")
        .select("id, period, activated_at, course_id, courses(name, section)")
        .eq("id", sessionId)
        .single()

    if (!session) return { success: false, error: "Sesión no encontrada" }

    const course = (session as any).courses
    const courseName = course
        ? `${course.name}${course.section ? " " + course.section : ""}`
        : "Curso"

    const { data: responses } = await supabase
        .from("radar_responses")
        .select("id")
        .eq("session_id", sessionId)

    const responseIds = (responses ?? []).map(r => r.id)

    const { data: items } = responseIds.length > 0
        ? await supabase
            .from("radar_response_items")
            .select("casel_axis, score")
            .in("response_id", responseIds)
        : { data: [] as { casel_axis: string; score: number }[] }

    const AXES = ["ac", "ag", "cs", "hr", "td"]
    const avgByAxis: Partial<Record<string, number>> = {}
    for (const ax of AXES) {
        const vals = (items ?? []).filter(i => i.casel_axis === ax).map(i => i.score)
        if (vals.length) {
            avgByAxis[ax] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
        }
    }

    return {
        success: true,
        data: {
            activatedAt: session.activated_at,
            responseCount: responseIds.length,
            avgByAxis,
            courseName,
            period: session.period,
        },
    }
}

export async function submitRadarResponse(
    sessionId: string,
    studentId: string,
    institutionId: string,
    answers: { question_key: string; casel_axis: string; score: number }[]
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { data: response, error: respError } = await supabase
        .from("radar_responses")
        .insert({ session_id: sessionId, student_id: studentId, institution_id: institutionId })
        .select("id")
        .single()

    if (respError) {
        if (respError.code === "23505") return { success: false, error: "Ya completaste este cuestionario." }
        return { success: false, error: respError.message }
    }

    const { error: itemsError } = await supabase
        .from("radar_response_items")
        .insert(answers.map(a => ({
            response_id: response.id,
            question_key: a.question_key,
            casel_axis: a.casel_axis,
            score: a.score,
        })))

    if (itemsError) {
        // Limpiar la fila huérfana para que el estudiante pueda reintentar
        await supabase.from("radar_responses").delete().eq("id", response.id)
        return { success: false, error: "Error al guardar las respuestas. Por favor intenta de nuevo." }
    }

    revalidatePath("/estudiante/radar")
    return { success: true }
}
