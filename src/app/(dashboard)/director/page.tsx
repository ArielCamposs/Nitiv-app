import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DirectorDashboardClient } from "@/components/director/director-dashboard-client"
import Link from "next/link"
import { climateScoreForAggregation } from "@/lib/climate-evaluation"

const EMOTION_SCORE: Record<string, number> = {
    muy_mal: 1, mal: 2, neutral: 3, bien: 4, muy_bien: 5,
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

async function getDirectorData() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
                    catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id, name, last_name")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id) redirect("/login")

    const iid = profile.institution_id

    // ── Queries en paralelo ──
    const [
        { data: courses },
        { data: students },
        { data: alerts },
        { data: incidents },
        { data: paecs },
        { data: emotionLogs },
        { data: teacherLogs },
    ] = await Promise.all([
        supabase.from("courses").select("id, name, level, section").eq("institution_id", iid).eq("active", true),
        supabase.from("students").select("id, name, last_name, course_id").eq("institution_id", iid).eq("active", true),
        supabase.from("alerts").select("id, student_id, type, description, created_at").eq("institution_id", iid).eq("resolved", false).order("created_at", { ascending: false }),
        supabase.from("incidents").select("id, student_id, folio, severity, type, resolved, incident_date, end_date").eq("institution_id", iid).eq("resolved", false).order("incident_date", { ascending: false }).limit(10),
        supabase.from("paec").select("id, student_id, review_date, requires_adjustments, representative_signed, guardian_signed, active").eq("institution_id", iid).eq("active", true),
        supabase.from("emotional_logs").select("student_id, emotion, created_at").eq("institution_id", iid).gte("created_at", new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString()).order("created_at", { ascending: true }),
        supabase.from("teacher_logs").select("course_id, energy_level, log_date").eq("institution_id", iid).gte("log_date", new Date(new Date().setDate(new Date().getDate() - 28)).toISOString().split("T")[0]),
    ])

    // ── Estadísticas generales ──
    const totalStudents = students?.length ?? 0
    const totalAlerts = alerts?.length ?? 0
    const totalIncidents = incidents?.length ?? 0

    const paecPendingReview = (paecs ?? []).filter(p => {
        const reviewSoon = p.review_date
            ? new Date(p.review_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : false
        return p.requires_adjustments || reviewSoon || (!p.representative_signed || !p.guardian_signed)
    }).length

    // ── Clima por curso ──
    const climatePorCurso = (courses ?? []).map(course => {
        const logs = (teacherLogs ?? []).filter(l => l.course_id === course.id)
        const avg = logs.length > 0
            ? Math.round((logs.reduce((a, l) => a + climateScoreForAggregation(l.energy_level), 0) / logs.length) * 10) / 10
            : null
        const label =
            avg === null ? "Sin datos" :
                avg >= 4 ? "Favorable ☀️" :
                    avg >= 3 ? "Intermedio 🌤️" :
                        avg >= 2 ? "Irregular ☁️" : "Muy adverso ⛈️"
        return {
            courseId: course.id,
            courseName: `${course.name} ${course.section ?? ""}`.trim(),
            promedio: avg,
            label,
            registros: logs.length,
        }
    }).sort((a, b) => (a.promedio ?? 0) - (b.promedio ?? 0))

    // ── Meses críticos (últimos 6 meses) ──
    const mesesMap: Record<string, { total: number; negativos: number; label: string }> = {}

    for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        mesesMap[key] = { total: 0, negativos: 0, label: MONTH_NAMES[d.getMonth()] }
    }

    for (const log of (emotionLogs ?? [])) {
        const d = new Date(log.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        if (mesesMap[key]) {
            mesesMap[key].total++
            if (log.emotion === "mal" || log.emotion === "muy_mal") mesesMap[key].negativos++
        }
    }

    const mesesData = Object.values(mesesMap).map(m => ({
        mes: m.label,
        total: m.total,
        negativos: m.negativos,
        pct: m.total > 0 ? Math.round((m.negativos / m.total) * 100) : 0,
    }))

    // ── Estudiantes en alerta enriquecidos ──
    const studentsMap = Object.fromEntries((students ?? []).map(s => [s.id, s]))
    const coursesMap = Object.fromEntries((courses ?? []).map(c => [c.id, c]))

    const alertsEnriched = (alerts ?? []).slice(0, 8).map(a => {
        const st = studentsMap[a.student_id]
        const co = st ? coursesMap[st.course_id ?? ""] : null
        return {
            ...a,
            studentName: st ? `${st.name} ${st.last_name}` : "Estudiante",
            courseName: co ? `${co.name} ${co.section ?? ""}`.trim() : "Sin curso",
        }
    })

    // ── DEC pendientes enriquecidos ──
    const incidentsEnriched = (incidents ?? []).map(i => {
        const st = studentsMap[i.student_id]
        return {
            ...i,
            studentName: st ? `${st.name} ${st.last_name}` : "Estudiante",
        }
    })

    // ── Bienestar promedio institucional ──
    const allScores = (emotionLogs ?? [])
        .filter(l => {
            const d = new Date(l.created_at)
            return d >= new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
        })
        .map(l => EMOTION_SCORE[l.emotion] ?? 3)

    const bienestarPromedio = allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : null

    return {
        profile,
        totalStudents,
        totalAlerts,
        totalIncidents,
        paecPendingReview,
        climatePorCurso,
        mesesData,
        alertsEnriched,
        incidentsEnriched,
        bienestarPromedio,
    }
}

export default async function DirectorDashboardPage() {
    const data = await getDirectorData()

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Dashboard Director</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Vista institucional — {data.profile.name} {data.profile.last_name}
                    </p>
                    <div className="mt-2">
                        <Link
                            href="/director/heatmap"
                            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
                        >
                            Ver mapa de clima emocional por curso →
                        </Link>
                    </div>
                </div>

                <DirectorDashboardClient {...data} />
            </div>
        </main>
    )
}
