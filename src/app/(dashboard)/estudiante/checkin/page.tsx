import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { EmotionSlider } from "@/components/emotional/emotion-slider"
import { PulseCheckinWrapper } from "@/components/pulse/pulse-checkin-wrapper"

// ─── Tipo para pulse session ──────────────────────────────────────────────────
type PulseSession = {
    id: string
    week_start: string
    week_end: string
} | null

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

    return {
        student,
        alreadyLogged,
        pulseSession: pulseSession as PulseSession,
        pulseAlreadyDone,
    }
}

export default async function EstudianteCheckinPage() {
    const data = await getCheckinData()

    if (!data) {
        return <div>No se encontró tu perfil de estudiante.</div>
    }

    const {
        student,
        alreadyLogged,
        pulseSession,
        pulseAlreadyDone,
    } = data

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Check-in Emocional
                    </h1>
                </div>

                {/* ── Modo Pulso (aparece solo si está activo y no registró) ── */}
                {pulseSession && !pulseAlreadyDone && (
                    <PulseCheckinWrapper
                        pulseSessionId={pulseSession.id}
                        studentId={student.id}
                        institutionId={student.institution_id}
                        weekStart={pulseSession.week_start}
                        weekEnd={pulseSession.week_end}
                    />
                )}

                {/* ── Registro emocional diario ── */}
                <section>
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800 mb-6">¿Cómo te sientes hoy?</h2>
                        <EmotionSlider
                            studentId={student.id}
                            institutionId={student.institution_id}
                            alreadyLogged={alreadyLogged}
                        />
                        <div className="flex justify-end mt-6">
                            <Link
                                href="/estudiante/historial"
                                className="text-sm text-indigo-600 hover:underline font-medium"
                            >
                                Ver mi historial emocional →
                            </Link>
                        </div>
                    </div>
                </section>

            </div>
        </main>
    )
}
