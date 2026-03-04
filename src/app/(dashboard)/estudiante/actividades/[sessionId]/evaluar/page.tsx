import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { bibliotecaActivities } from "@/lib/data/biblioteca"
import { EvaluationForm } from "./evaluation-form"

export default async function EvaluateActivityPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login")
    }

    // Fetch the session details
    const { data: session, error } = await supabase
        .from("activity_sessions")
        .select("id, activity_id, teacher_id, created_at")
        .eq("id", sessionId)
        .single()

    if (error || !session) {
        notFound()
    }

    // Check if the student has already evaluated this session
    const { data: existingEvaluation } = await supabase
        .from("activity_evaluations")
        .select("id")
        .eq("session_id", sessionId)
        .eq("student_id", user.id)
        .single()

    const activity = bibliotecaActivities.find(a => a.id === session.activity_id)
    const activityTitle = activity ? activity.title : "Actividad"

    if (existingEvaluation) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">¡Gracias por valorar!</h1>
                    <p className="text-slate-600">
                        Ya has enviado tu evaluación (Ticket de Salida) para la actividad <strong>{activityTitle}</strong>.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Ticket de Salida</h1>
                    <p className="text-slate-600">
                        Valora la actividad <strong>{activityTitle}</strong> que realizaste recientemente.
                        Tu opinión es importante para seguir mejorando.
                    </p>
                </div>

                <EvaluationForm sessionId={sessionId} activityTitle={activityTitle} />
            </div>
        </div>
    )
}
