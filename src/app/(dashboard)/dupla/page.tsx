import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HelpRequestsPanel } from "@/components/help/HelpRequestsPanel"
import { DuplaDashboardClient, DuplaStats } from "@/components/dupla/DuplaDashboardClient"
import { RadarDashboardWidget } from "@/components/radar/RadarDashboardWidget"

const EMOTION_SCORE: Record<string, number> = {
    muy_mal: 1, mal: 2, neutral: 3, bien: 4, muy_bien: 5,
}
const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

export default async function DuplaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("id, name, last_name, institution_id")
        .eq("id", user.id)
        .single()

    if (!profile?.institution_id) return redirect("/login")
    const iid = profile.institution_id

    const now = new Date()
    const day28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const [
        { data: students },
        { data: alerts },
        { data: helpRequests },
        { data: emotionLogs30d },
        { data: emotionLogsWeek },
        { data: teacherLogs },
        { data: courses },
    ] = await Promise.all([
        supabase.from("students").select("id, name, last_name, course_id").eq("institution_id", iid).eq("active", true),
        supabase.from("alerts").select("id, student_id, type, created_at, resolved").eq("institution_id", iid).eq("resolved", false).order("created_at", { ascending: false }),
        supabase.from("help_requests").select("id, status").eq("institution_id", iid).eq("status", "pending"),
        supabase.from("emotional_logs").select("student_id, emotion, created_at").eq("institution_id", iid).gte("created_at", day30Ago).order("created_at"),
        supabase.from("emotional_logs").select("student_id, emotion, created_at").eq("institution_id", iid).gte("created_at", weekStart.toISOString()),
        supabase.from("teacher_logs").select("course_id, energy_level, log_date").eq("institution_id", iid).gte("log_date", day28Ago),
        supabase.from("courses").select("id, name, section").eq("institution_id", iid).eq("active", true),
    ])

    // ── KPI counts ──────────────────────────────────────────────────────────────
    const totalStudents = students?.length ?? 0
    const activeAlerts = alerts?.length ?? 0
    const helpCount = helpRequests?.length ?? 0
    const checkinsThisWeek = emotionLogsWeek?.length ?? 0

    // ── Bienestar promedio (últimos 30 días) ────────────────────────────────────
    const last30Scores = (emotionLogs30d ?? []).map(l => EMOTION_SCORE[l.emotion] ?? 3)
    const bienestarPromedio = last30Scores.length > 0
        ? Math.round((last30Scores.reduce((a, b) => a + b, 0) / last30Scores.length) * 10) / 10
        : null

    // ── Distribución emocional (últimos 30 días) ────────────────────────────────
    const emotionCount: Record<string, number> = { muy_bien: 0, bien: 0, neutral: 0, mal: 0, muy_mal: 0 }
    for (const l of (emotionLogs30d ?? [])) {
        if (emotionCount[l.emotion] !== undefined) emotionCount[l.emotion]++
    }
    const emotionColors: Record<string, string> = {
        muy_bien: "#10b981", bien: "#34d399", neutral: "#94a3b8", mal: "#f97316", muy_mal: "#ef4444",
    }
    const emotionLabels: Record<string, string> = {
        muy_bien: "Muy bien", bien: "Bien", neutral: "Neutral", mal: "Mal", muy_mal: "Muy mal",
    }
    const emotionDistribution = Object.entries(emotionCount).map(([key, value]) => ({
        name: emotionLabels[key],
        value,
        color: emotionColors[key],
    }))

    // ── Tendencia por semana — últimas 4 semanas ────────────────────────────────
    const weeklyTrend = Array.from({ length: 4 }, (_, wi) => {
        const weekEnd = new Date(now.getTime() - wi * 7 * 24 * 60 * 60 * 1000)
        const weekStart2 = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
        const weekLogs = (emotionLogs30d ?? []).filter(l => {
            const d = new Date(l.created_at)
            return d >= weekStart2 && d <= weekEnd
        })
        return {
            day: `S${4 - wi}`,
            muy_bien: weekLogs.filter(l => l.emotion === "muy_bien").length,
            bien: weekLogs.filter(l => l.emotion === "bien").length,
            neutral: weekLogs.filter(l => l.emotion === "neutral").length,
            mal: weekLogs.filter(l => l.emotion === "mal").length,
            muy_mal: weekLogs.filter(l => l.emotion === "muy_mal").length,
        }
    }).reverse()

    // ── Participación semanal ───────────────────────────────────────────────────
    const uniqueStudentsThisWeek = new Set((emotionLogsWeek ?? []).map(l => l.student_id)).size
    const participationRate = totalStudents > 0 ? Math.round((uniqueStudentsThisWeek / totalStudents) * 100) : 0
    const studentsWithoutCheckin = totalStudents - uniqueStudentsThisWeek

    // ── Clima de aula por curso ──────────────────────────────────────────────────
    const climatePorCurso = (courses ?? []).map(c => {
        const logs = (teacherLogs ?? []).filter(l => l.course_id === c.id)
        const score = logs.length > 0
            ? Math.round((logs.reduce((s, l) => s + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / logs.length) * 10) / 10
            : 0
        const label = score === 0 ? "Sin datos" : score >= 3.5 ? "Regulada" : score >= 2.5 ? "Inquieta" : "Apática/Explosiva"
        return { curso: `${c.name}${c.section ? " " + c.section : ""}`, score, label }
    }).filter(c => c.score > 0).sort((a, b) => a.score - b.score)

    // ── Alertas por tipo ─────────────────────────────────────────────────────────
    const alertTypeCounts: Record<string, number> = {}
    for (const a of (alerts ?? [])) {
        alertTypeCounts[a.type] = (alertTypeCounts[a.type] ?? 0) + 1
    }
    const typeLabels: Record<string, string> = {
        registros_negativos: "Emoc. negativa",
        discrepancia_docente: "Discrepancia",
        sin_registro: "Sin registro",
        comportamiento: "Conducta",
        otro: "Otro",
    }
    const typeColors: Record<string, string> = {
        registros_negativos: "#ef4444",
        discrepancia_docente: "#f97316",
        sin_registro: "#94a3b8",
        comportamiento: "#8b5cf6",
        otro: "#64748b",
    }
    const alertsByType = Object.entries(alertTypeCounts).map(([type, count]) => ({
        name: typeLabels[type] ?? type,
        count,
        color: typeColors[type] ?? "#64748b",
    }))

    // ── Alertas recientes enriquecidas ───────────────────────────────────────────
    const studentsMap = Object.fromEntries((students ?? []).map(s => [s.id, s]))
    const coursesMap = Object.fromEntries((courses ?? []).map(c => [c.id, c]))
    const recentAlerts = (alerts ?? []).slice(0, 5).map(a => {
        const st = studentsMap[a.student_id]
        const co = st ? coursesMap[st.course_id ?? ""] : null
        return {
            id: a.id, type: a.type, created_at: a.created_at,
            studentName: st ? `${st.name} ${st.last_name}` : "Estudiante",
            courseName: co ? `${co.name}${co.section ? " " + co.section : ""}` : "Sin curso",
        }
    })

    const stats: DuplaStats = {
        totalStudents, activeAlerts, helpRequests: helpCount,
        checkinsThisWeek, emotionDistribution, weeklyTrend,
        climatePorCurso, alertsByType, bienestarPromedio, recentAlerts,
        participationRate, studentsWithoutCheckin,
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Dashboard Dupla</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Bienvenido/a, <span className="font-medium text-slate-700">{profile.name} {profile.last_name}</span>
                    </p>
                </div>

                {/* Charts + KPI */}
                {/* Radar activo — posición prominente */}
                <RadarDashboardWidget institutionId={iid} role="dupla" />

                <DuplaDashboardClient stats={stats} />

                {/* Help requests */}
                {iid && (
                    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
                        <HelpRequestsPanel institutionId={iid} />
                    </section>
                )}
            </div>
        </main>
    )
}
