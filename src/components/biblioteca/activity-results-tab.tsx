import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquareQuote, BrainCircuit, Zap, ThumbsUp, CalendarClock, Users } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ActivityResultsTabProps {
    activityId: string
    teacherId: string
}

export async function ActivityResultsTab({ activityId, teacherId }: ActivityResultsTabProps) {
    const supabase = await createClient()

    // 1. Fetch sessions for this teacher and activity
    const { data: sessions, error: sessionError } = await supabase
        .from("activity_sessions")
        .select(`
            id,
            completed_at,
            courses (
                name,
                level
            )
        `)
        .eq("activity_id", activityId)
        .eq("teacher_id", teacherId)
        .order("completed_at", { ascending: false })

    if (sessionError || !sessions || sessions.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border">
                Aún no has registrado esta actividad con ningún curso.
                <br />Usa el botón "Marcar como Realizada" para comenzar a recibir Tickets de Salida.
            </div>
        )
    }

    const sessionIds = sessions.map(s => s.id)

    // 2. Fetch combined evaluations for those sessions
    const { data: evals, error: evalError } = await supabase
        .from("activity_evaluations")
        .select(`
            id,
            rating,
            emotional_utility,
            energy_post,
            feedback_rating,
            feedback,
            created_at,
            session_id,
            users (
                id,
                name,
                last_name
            )
        `)
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })

    if (evalError) console.error("Error fetching evals:", evalError)
    const evaluations = evals || []

    // Group sessions by date
    const groupedSessions = sessions.reduce((acc, session) => {
        const dateStr = new Date(session.completed_at).toISOString().split('T')[0]
        if (!acc[dateStr]) acc[dateStr] = []
        acc[dateStr].push(session)
        return acc
    }, {} as Record<string, typeof sessions>)

    const sortedDates = Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a))

    // Helpers
    const calcAvg = (evalsArray: any[], field: string) => {
        const valid = evalsArray.filter(e => typeof e[field] === 'number')
        if (valid.length === 0) return "—"
        return (valid.reduce((acc, curr) => acc + curr[field], 0) / valid.length).toFixed(1)
    }

    return (
        <div className="space-y-10">
            {sortedDates.map((dateStr) => {
                const dateSessions = groupedSessions[dateStr]
                const formattedDate = format(new Date(`${dateStr}T12:00:00`), "EEEE, d 'de' MMMM yyyy", { locale: es })

                return (
                    <div key={dateStr} className="space-y-4">
                        <div className="flex items-center gap-3 mb-2 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm py-2">
                            <div className="flex bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full items-center gap-2 font-semibold shadow-sm text-sm">
                                <CalendarClock className="w-4 h-4" />
                                <span className="capitalize">{formattedDate}</span>
                            </div>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>

                        <div className="grid gap-6 pl-2 md:pl-4 border-l-2 border-indigo-100">
                            {dateSessions.map((session) => {
                                const sessionEvals = evaluations.filter(e => e.session_id === session.id)
                                const courseData = session.courses as any
                                const courseName = courseData ? `${courseData.level} - ${courseData.name}` : 'Curso Desconocido'
                                const timeStr = format(new Date(session.completed_at), "HH:mm")

                                const avgUtility = calcAvg(sessionEvals, "emotional_utility")
                                const avgEnergy = calcAvg(sessionEvals, "energy_post")
                                const avgFeedback = calcAvg(sessionEvals, "feedback_rating")
                                const feedbacks = sessionEvals.filter(e => e.feedback && e.feedback.trim() !== "")

                                return (
                                    <div key={session.id} className="relative">
                                        {/* Timeline dot */}
                                        <div className="absolute -left-[21px] md:-left-[29px] top-6 w-3 h-3 rounded-full bg-indigo-400 ring-4 ring-white"></div>

                                        <Card className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
                                            <CardHeader className="bg-white border-b pb-4 pt-5 px-5 lg:px-6">
                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                {timeStr} hrs
                                                            </span>
                                                            <div className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                                                                <Users className="w-3.5 h-3.5" />
                                                                {sessionEvals.length} respuestas
                                                            </div>
                                                        </div>
                                                        <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                                                            {courseName}
                                                        </CardTitle>
                                                    </div>

                                                    <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 lg:pb-0">
                                                        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border min-w-[100px]">
                                                            <BrainCircuit className="w-4 h-4 text-purple-500 mb-1" />
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center leading-tight">Utilidad<br />Emocional</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="font-bold text-xl text-slate-800">{avgUtility}</span>
                                                                <span className="text-slate-400 text-xs font-medium">/ 7</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border min-w-[100px]">
                                                            <Zap className="w-4 h-4 text-amber-500 mb-1" />
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center leading-tight">Nivel de<br />Energía</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="font-bold text-xl text-slate-800">{avgEnergy}</span>
                                                                <span className="text-slate-400 text-xs font-medium">/ 7</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border min-w-[100px]">
                                                            <ThumbsUp className="w-4 h-4 text-emerald-500 mb-1" />
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center leading-tight">Valoración<br />Actividad</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="font-bold text-xl text-slate-800">{avgFeedback}</span>
                                                                <span className="text-slate-400 text-xs font-medium">/ 7</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            {feedbacks.length > 0 && (
                                                <CardContent className="bg-slate-50/50 pt-5 pb-5 px-5 lg:px-6">
                                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
                                                        <MessageSquareQuote className="w-4 h-4 text-indigo-500" />
                                                        Comentarios de los estudiantes
                                                    </h4>
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        {feedbacks.map(f => (
                                                            <div key={f.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative">
                                                                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                                                                    &ldquo;{f.feedback}&rdquo;
                                                                </p>
                                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                                                    <p className="text-xs font-medium text-slate-500">
                                                                        {(f.users as any)?.name} {(f.users as any)?.last_name}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 opacity-60">
                                                                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">{f.emotional_utility}</span>
                                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{f.energy_post}</span>
                                                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{f.feedback_rating}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            )}
                                        </Card>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
