import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { EmotionSlider } from "@/components/emotional/emotion-slider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

async function getCheckinData() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: student } = await supabase
        .from("students")
        .select("id, institution_id, name, last_name")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) return null

    // ── Verificar si ya registró hoy ──
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const tomorrow = new Date(startOfDay)
    tomorrow.setDate(startOfDay.getDate() + 1)

    const { data: todayLog } = await supabase
        .from("emotional_logs")
        .select("id")
        .eq("student_id", student.id)
        .eq("type", "daily")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", tomorrow.toISOString())
        .maybeSingle()

    const alreadyLogged = !!todayLog

    // ── Verificar Modo Pulso activo ───────────────────────────────────────────
    const { data: pulseSession } = await supabase
        .from("pulse_sessions")
        .select("id, week_start, week_end")
        .eq("institution_id", student.institution_id)
        .eq("active", true)
        .maybeSingle()

    // Si hay sesión activa, ver si el estudiante ya registró
    let pulseAlreadyDone = false
    if (pulseSession) {
        const { data: pulseEntry } = await supabase
            .from("pulse_student_entries")
            .select("id")
            .eq("pulse_session_id", pulseSession.id)
            .eq("student_id", student.id)
            .maybeSingle()
        pulseAlreadyDone = !!pulseEntry
    }

    // ── Todo el Historial Emocional ──
    const { data: logs } = await supabase
        .from("emotional_logs")
        .select("id, emotion, stress_level, anxiety_level, reflection, type, created_at")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(50)

    return {
        student,
        alreadyLogged,
        logs: logs || [],
    }
}

const EMOTION_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    muy_bien: { label: "Muy bien", emoji: "😄", color: "bg-emerald-100 text-emerald-700" },
    bien: { label: "Bien", emoji: "🙂", color: "bg-emerald-50 text-emerald-600" },
    neutral: { label: "Neutral", emoji: "😐", color: "bg-slate-100 text-slate-600" },
    mal: { label: "Mal", emoji: "😔", color: "bg-rose-100 text-rose-600" },
    muy_mal: { label: "Muy mal", emoji: "😢", color: "bg-rose-200 text-rose-700" },
}

export default async function EstudianteCheckinPage() {
    const data = await getCheckinData()

    if (!data) {
        return <div>No se encontró tu perfil de estudiante.</div>
    }

    const {
        student,
        alreadyLogged,
        logs,
    } = data

    // Calcular estadísticas
    const total = logs.length
    const conReflexion = logs.filter(l => l.reflection).length

    const emotionCount = logs.reduce((acc: Record<string, number>, l: any) => {
        acc[l.emotion] = (acc[l.emotion] ?? 0) + 1
        return acc
    }, {})
    const topEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0]?.[0]

    const avgStress = total > 0
        ? (logs.reduce((a, l) => a + (l.stress_level ?? 3), 0) / total).toFixed(1)
        : "—"

    const avgAnxiety = total > 0
        ? (logs.reduce((a, l) => a + (l.anxiety_level ?? 3), 0) / total).toFixed(1)
        : "—"

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Check-in Emocional
                    </h1>
                </div>

                {/* ── Registro emocional diario ── */}
                <section>
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800 mb-6">¿Cómo te sientes hoy?</h2>
                        <EmotionSlider
                            studentId={student.id}
                            institutionId={student.institution_id}
                            alreadyLogged={alreadyLogged}
                        />
                    </div>
                </section>

                {/* ── Historial Emocional Completo ── */}
                <section className="mt-8 space-y-6">
                    <h2 className="text-xl font-semibold text-slate-900">Mi historial emocional</h2>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Registros totales", value: total },
                            { label: "Con reflexión", value: conReflexion },
                            { label: "Estrés / Ansiedad prom.", value: avgStress !== "—" && avgAnxiety !== "—" ? `${avgStress} / ${avgAnxiety}` : "—" },
                            { label: "Emoción frecuente", value: topEmotion ? EMOTION_CONFIG[topEmotion]?.emoji + " " + EMOTION_CONFIG[topEmotion]?.label : "—" },
                        ].map((stat) => (
                            <Card key={stat.label}>
                                <CardContent className="pt-4 text-center">
                                    <p className="text-xl font-bold text-indigo-600">{stat.value}</p>
                                    <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Lista de registros */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Registros recientes</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y">
                            {logs.length === 0 && (
                                <p className="text-sm text-slate-500 py-4 text-center">
                                    Aún no tienes registros emocionales.
                                </p>
                            )}
                            {logs.map((log: any) => {
                                const cfg = EMOTION_CONFIG[log.emotion] ?? EMOTION_CONFIG.neutral
                                return (
                                    <div key={log.id} className="flex items-start gap-3 py-4">
                                        <span className="text-2xl mt-1">{cfg.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.color}`}>
                                                    {cfg.label}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-slate-500 border-slate-200">
                                                    {log.type === "daily" ? "Diario" : "Semanal"}
                                                </Badge>
                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    😰 Estrés: {log.stress_level ?? "—"}/5 <span className="text-slate-300 mx-1">·</span> 😟 Ansiedad: {log.anxiety_level ?? "—"}/5
                                                </span>
                                            </div>
                                            {log.reflection && (
                                                <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                    "{log.reflection}"
                                                </p>
                                            )}
                                            <p className="text-xs font-medium text-slate-400 mt-2">
                                                {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                    weekday: "long", day: "numeric", month: "long"
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </section>

            </div>
        </main>
    )
}
