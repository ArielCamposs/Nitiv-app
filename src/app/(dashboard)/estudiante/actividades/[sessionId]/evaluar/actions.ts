"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

interface SubmitEvaluationParams {
    sessionId: string
    emotionalUtility: number
    energyPost: number
    feedbackRating: number
    feedback: string
}

export async function submitActivityEvaluation({
    sessionId,
    emotionalUtility,
    energyPost,
    feedbackRating,
    feedback
}: SubmitEvaluationParams) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "No autorizado" }
    }

    // Insert evaluation
    const { error: insertError } = await supabase
        .from("activity_evaluations")
        .insert({
            session_id: sessionId,
            student_id: user.id,
            rating: null, // Obsolete field, keeping for schema compatibility or nullable
            emotional_utility: emotionalUtility,
            energy_post: energyPost,
            feedback_rating: feedbackRating,
            feedback: feedback.trim() || null
        })

    if (insertError) {
        console.error("Error submitting evaluation:", insertError)
        // Usually 23505 means unique violation, if student already rated
        if (insertError.code === "23505") {
            return { error: "Ya has enviado una valoración para esta actividad." }
        }
        return { error: "No se pudo guardar la valoración." }
    }

    // Try to mark notification as read optionally here if needed, or rely on existing logic.
    // For now, insertion is enough.

    revalidatePath(`/estudiante/actividades/${sessionId}/evaluar`)

    return { success: true }
}
