import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Radar, Lock } from "lucide-react"
import { RadarStudentForm } from "@/components/radar/RadarStudentForm"

const PERIOD_LABELS: Record<string, string> = {
    inicio_s1: "Inicio Semestre 1", termino_s1: "Término Semestre 1",
    inicio_s2: "Inicio Semestre 2", termino_s2: "Término Semestre 2",
}

async function getRadarData() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(s) { try { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: student } = await supabase
        .from("students").select("id, institution_id, name, last_name, course_id")
        .eq("user_id", user.id).maybeSingle()
    if (!student?.course_id) return { student, pendingSessions: [], completedSessions: [] }

    // All active sessions for this course
    const { data: activeSessions } = await supabase
        .from("radar_sessions").select("id, period, activated_at")
        .eq("institution_id", student.institution_id)
        .eq("course_id", student.course_id).eq("active", true)

    if (!activeSessions?.length) return { student, pendingSessions: [], completedSessions: [] }

    // Student's responses
    const { data: responses } = await supabase
        .from("radar_responses").select("session_id")
        .eq("student_id", student.id)
        .in("session_id", activeSessions.map(s => s.id))

    const respondedIds = new Set((responses ?? []).map(r => r.session_id))
    const pendingSessions = activeSessions.filter(s => !respondedIds.has(s.id))
    const completedSessions = activeSessions.filter(s => respondedIds.has(s.id))

    return { student, pendingSessions, completedSessions }
}

export default async function EstudianteRadarPage() {
    const data = await getRadarData()
    if (!data) return <div>No se encontró tu perfil de estudiante.</div>

    const { student, pendingSessions, completedSessions } = data
    const hasPending = pendingSessions.length > 0
    const noSessions = pendingSessions.length === 0 && completedSessions.length === 0
    const firstPending = pendingSessions[0]

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Radar className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Radar de Competencias</h1>
                        <p className="text-slate-500 text-sm">Evalúa tus propias competencias socioemocionales</p>
                    </div>
                </div>

                {/* No sessions active */}
                {noSessions && (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-7 h-7 text-slate-400" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-700 mb-2">Sección no disponible</h2>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            El Radar de Competencias aún no ha sido activado para tu curso.
                            Tu dupla o encargado de convivencia lo habilitará cuando sea el momento.
                        </p>
                    </section>
                )}

                {/* All completed (no pending) */}
                {!noSessions && !hasPending && completedSessions.length > 0 && (
                    <section className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">¡Estás al día!</h2>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            Completaste todos los cuestionarios de Radar disponibles para tu curso.
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {completedSessions.map(s => (
                                <span key={s.id} className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                                    ✓ {PERIOD_LABELS[s.period] ?? s.period}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Pending session — show form */}
                {hasPending && firstPending && student && (
                    <>
                        {/* Show if there are also completed ones */}
                        {completedSessions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {completedSessions.map(s => (
                                    <span key={s.id} className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                                        ✓ {PERIOD_LABELS[s.period] ?? s.period}
                                    </span>
                                ))}
                            </div>
                        )}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <RadarStudentForm
                                sessionId={firstPending.id}
                                studentId={student.id}
                                institutionId={student.institution_id}
                                period={firstPending.period}
                            />
                        </section>
                    </>
                )}
            </div>
        </main>
    )
}
