"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createNotifications, getStudentIdsByCourses } from "@/lib/notifications"

interface CreateSessionParams {
    activityId: string
    courseId: string
}

export async function createActivitySession({ activityId, courseId }: CreateSessionParams) {
    const supabase = await createClient()

    // 1. Validate auth & get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "No autorizado" }
    }

    // 2. Insert the session
    const { data: session, error: insertError } = await supabase
        .from("activity_sessions")
        .insert({
            activity_id: activityId,
            teacher_id: user.id,
            course_id: courseId,
        })
        .select()
        .single()

    if (insertError) {
        console.error("Error creating activity session:", insertError)
        return { error: "No se pudo registrar la actividad" }
    }

    // 3. Get students enrolled in this course to send notifications
    // We need the institutionId from the user to query safely
    const { data: userData } = await supabase
        .from("users")
        .select("institution_id")
        .eq("id", user.id)
        .single()

    if (userData?.institution_id) {
        const studentUserIds = await getStudentIdsByCourses(userData.institution_id, [courseId])

        if (studentUserIds.length > 0) {
            const { data: activity } = await supabase
                .from("biblioteca_activities")
                .select("title")
                .eq("id", activityId)
                .single()

            const activityTitle = activity?.title || "Actividad de Biblioteca"

            await createNotifications({
                institutionId: userData.institution_id,
                recipientIds: studentUserIds,
                type: "actividad_evaluada",
                title: "Ticket de Salida Pendiente",
                message: `Tu profesor ha finalizado '${activityTitle}'. Por favor, cuéntanos qué te pareció.`,
                relatedId: session.id, // Linking notification to the session ID
                relatedUrl: `/estudiante/actividades/${session.id}/evaluar` // URL for the student
            })
        }
    }

    // 4. Revalidate cache if necessary
    revalidatePath(`/biblioteca/${activityId}`)

    return { success: true, session }
}
