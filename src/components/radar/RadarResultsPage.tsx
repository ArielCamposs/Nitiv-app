import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, TrendingUp, TrendingDown, Star } from "lucide-react"
import { RadarStudentResultsClient, type StudentResult } from "@/components/radar/RadarStudentResultsClient"
import { RadarChart } from "@/components/radar/RadarChart"

const AXES = {
    ac: { label: "Autoconciencia",     emoji: "🧠", color: "#db2777", bg: "#fdf2f8" },
    ag: { label: "Autogestión",        emoji: "🎯", color: "#7c3aed", bg: "#f5f3ff" },
    cs: { label: "Conciencia Social",  emoji: "🤝", color: "#d97706", bg: "#fffbeb" },
    hr: { label: "Hab. Relacionales",  emoji: "💬", color: "#4f46e5", bg: "#eef2ff" },
    td: { label: "Toma de Decisiones", emoji: "⚖️", color: "#b45309", bg: "#fef3c7" },
} as const
type AxisKey = keyof typeof AXES
const AXIS_ORDER: AxisKey[] = ["ac", "ag", "cs", "hr", "td"]

const PERIOD_LABELS: Record<string, string> = {
    inicio_s1: "Inicio Semestre 1", termino_s1: "Término Semestre 1",
    inicio_s2: "Inicio Semestre 2", termino_s2: "Término Semestre 2",
}

const scoreLabel = (s: number) =>
    s >= 4.5 ? "Excelente" : s >= 3.5 ? "Bien" : s >= 2.5 ? "A veces" : s >= 1.5 ? "Con dificultad" : "Bajo apoyo"

const scoreColor = (s: number) =>
    s >= 4 ? "#22c55e" : s >= 3 ? "#3b82f6" : s >= 2 ? "#f97316" : "#ef4444"

interface Props { params: Promise<{ sessionId: string }>; role: "dupla" | "convivencia" }

export async function RadarResultsPage({ params, role }: Props) {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect("/login")

    const { data: profile } = await supabase
        .from("users").select("role, institution_id").eq("id", user.id).single()
    if (!profile?.institution_id || profile.role !== role) return redirect(`/${role}`)
    const iid = profile.institution_id

    const { data: session } = await supabase
        .from("radar_sessions")
        .select("id, period, activated_at, course_id, courses(name, section)")
        .eq("id", sessionId).eq("institution_id", iid).maybeSingle()
    if (!session) return notFound()

    const course = (session as any).courses
    const courseName = course ? `${course.name}${course.section ? " " + course.section : ""}` : "Curso"

    const { count: totalStudents } = await supabase
        .from("students").select("id", { count: "exact", head: true })
        .eq("course_id", session.course_id).eq("active", true)

    const { data: responses } = await supabase
        .from("radar_responses")
        .select("id, student_id, completed_at, students(name, last_name)")
        .eq("session_id", sessionId)
        .order("completed_at", { ascending: false })

    const responseIds = (responses ?? []).map(r => r.id)

    const { data: allItems } = responseIds.length > 0
        ? await supabase.from("radar_response_items").select("response_id, casel_axis, score").in("response_id", responseIds)
        : { data: [] }

    // Group items by response_id
    const itemsByResponse: Record<string, { casel_axis: string; score: number }[]> = {}
    for (const item of allItems ?? []) {
        if (!itemsByResponse[item.response_id]) itemsByResponse[item.response_id] = []
        itemsByResponse[item.response_id].push(item)
    }

    // Global averages + distribution per axis
    const globalAvg: Partial<Record<AxisKey, number>> = {}
    const distribution: Partial<Record<AxisKey, number[]>> = {} // counts for scores 1-5

    for (const ax of AXIS_ORDER) {
        const vals = (allItems ?? []).filter(i => i.casel_axis === ax).map(i => i.score)
        if (vals.length) {
            globalAvg[ax] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
            const dist = [0, 0, 0, 0, 0]
            for (const v of vals) dist[Math.round(v) - 1]++
            distribution[ax] = dist
        }
    }

    const responseCount = responses?.length ?? 0
    const participationPct = totalStudents ? Math.round((responseCount / totalStudents) * 100) : 0

    // Overall average
    const allAvgs = Object.values(globalAvg).filter(v => v !== undefined) as number[]
    const overallAvg = allAvgs.length ? Math.round((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) * 10) / 10 : null

    // Best / worst axis
    const sortedAxes = AXIS_ORDER.filter(ax => globalAvg[ax] !== undefined)
        .sort((a, b) => (globalAvg[b] ?? 0) - (globalAvg[a] ?? 0))
    const bestAxis = sortedAxes[0]
    const worstAxis = sortedAxes[sortedAxes.length - 1]

    // Students below 2.5 in any axis
    const studentsAtRisk = responseIds.filter(rid => {
        const items = itemsByResponse[rid] ?? []
        for (const ax of AXIS_ORDER) {
            const vals = items.filter(i => i.casel_axis === ax).map(i => i.score)
            if (vals.length) {
                const avg = vals.reduce((a, b) => a + b, 0) / vals.length
                if (avg < 2.5) return true
            }
        }
        return false
    }).length

    // Build StudentResult list
    const studentResults: StudentResult[] = (responses ?? []).map(r => {
        const st = (r as any).students
        const items = itemsByResponse[r.id] ?? []
        const scores: Partial<Record<AxisKey, number>> = {}
        for (const ax of AXIS_ORDER) {
            const vals = items.filter(i => i.casel_axis === ax).map(i => i.score)
            if (vals.length) scores[ax] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
        }
        return {
            id: r.id,
            name: st ? `${st.name} ${st.last_name}` : "Estudiante",
            completedAt: r.completed_at,
            scores,
        }
    })

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-5">
                <Link href={`/${role}/radar`} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" /> Volver a Radar
                </Link>

                <div>
                    <h1 className="text-xl font-bold text-slate-900">Resultados — {courseName}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {PERIOD_LABELS[session.period] ?? session.period} · Activado el{" "}
                        {new Date(session.activated_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>

                {/* ── Stats row ──────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Participation */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-center text-center">
                        <Users className="w-5 h-5 text-indigo-400 mb-1.5" />
                        <p className="text-2xl font-extrabold text-slate-800 leading-none">
                            {responseCount}<span className="text-sm text-slate-400 font-medium">/{totalStudents ?? "?"}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">Participación</p>
                        <p className="text-xs font-bold mt-0.5" style={{ color: participationPct >= 70 ? "#22c55e" : participationPct >= 40 ? "#f97316" : "#ef4444" }}>
                            {participationPct}%
                        </p>
                    </div>

                    {/* Overall avg */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-center text-center">
                        <Star className="w-5 h-5 text-amber-400 mb-1.5" />
                        <p className="text-2xl font-extrabold leading-none" style={{ color: overallAvg ? scoreColor(overallAvg) : "#94a3b8" }}>
                            {overallAvg?.toFixed(1) ?? "—"}<span className="text-sm text-slate-400 font-medium">/5</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">Promedio gral.</p>
                        <p className="text-xs font-bold mt-0.5 text-slate-500">{overallAvg ? scoreLabel(overallAvg) : ""}</p>
                    </div>

                    {/* At risk */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-center text-center">
                        <TrendingDown className="w-5 h-5 text-rose-400 mb-1.5" />
                        <p className="text-2xl font-extrabold text-slate-800 leading-none">{studentsAtRisk}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">Requieren apoyo</p>
                        <p className="text-xs text-slate-400 mt-0.5">{"<2.5 en algún eje"}</p>
                    </div>
                </div>

                {/* ── Best / Worst axis ─────────────────────────────────── */}
                {bestAxis && worstAxis && bestAxis !== worstAxis && responseCount > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Eje más fuerte</span>
                            </div>
                            <p className="text-2xl">{AXES[bestAxis].emoji}</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">{AXES[bestAxis].label}</p>
                            <p className="text-xl font-extrabold mt-0.5" style={{ color: AXES[bestAxis].color }}>
                                {globalAvg[bestAxis]?.toFixed(1)}/5
                            </p>
                        </div>
                        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-2">
                                <TrendingDown className="w-4 h-4 text-rose-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Eje a reforzar</span>
                            </div>
                            <p className="text-2xl">{AXES[worstAxis].emoji}</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">{AXES[worstAxis].label}</p>
                            <p className="text-xl font-extrabold mt-0.5" style={{ color: AXES[worstAxis].color }}>
                                {globalAvg[worstAxis]?.toFixed(1)}/5
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Per-axis cards ────────────────────────────────────── */}
                {responseCount > 0 && (
                    <div>
                        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-3">Detalle por eje CASEL</h2>

                        {/* Radar chart */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-3">
                            <RadarChart scores={globalAvg} />
                        </div>

                        {/* Student list — right below the spider chart */}
                        <div className="space-y-2 mb-3">
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                                Por estudiante — clic para ver detalles
                            </h2>
                            <RadarStudentResultsClient students={studentResults} />
                        </div>

                        {/* Per-axis cards: 3 arriba, 2 abajo, centrados */}
                        <div className="grid gap-3">
                            <div className="grid gap-3 md:grid-cols-3">
                                {AXIS_ORDER.slice(0, 3).map(ax => {
                                    const avg = globalAvg[ax]
                                    const dist = distribution[ax]
                                    if (avg === undefined || !dist) return null
                                    const a = AXES[ax]
                                    const total_items = dist.reduce((s, c) => s + c, 0)

                                    return (
                                        <div key={ax} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{a.emoji}</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{a.label}</p>
                                                        <p className="text-xs text-slate-400">{scoreLabel(avg)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-extrabold" style={{ color: a.color }}>{avg.toFixed(1)}</p>
                                                    <p className="text-[10px] text-slate-400">de 5</p>
                                                </div>
                                            </div>

                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${(avg / 5) * 100}%`, backgroundColor: a.color }} />
                                            </div>

                                            <div className="space-y-1.5">
                                                {[
                                                    { score: 5, label: "Lo hago excelente", color: "#22c55e" },
                                                    { score: 4, label: "Lo hago bien",       color: "#3b82f6" },
                                                    { score: 3, label: "A veces lo logro",   color: "#eab308" },
                                                    { score: 2, label: "Me cuesta un poco",  color: "#f97316" },
                                                    { score: 1, label: "Me cuesta mucho",    color: "#ef4444" },
                                                ].map(opt => {
                                                    const count = dist[opt.score - 1]
                                                    const pct = total_items ? Math.round((count / total_items) * 100) : 0
                                                    return (
                                                        <div key={opt.score} className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 w-3 text-right shrink-0">{opt.score}</span>
                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: opt.color }} />
                                                            </div>
                                                            <span className="text-[10px] font-semibold text-slate-500 w-6 shrink-0">{count}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="grid gap-3 md:grid-cols-3 justify-items-center">
                                {AXIS_ORDER.slice(3).map(ax => {
                                    const avg = globalAvg[ax]
                                    const dist = distribution[ax]
                                    if (avg === undefined || !dist) return null
                                    const a = AXES[ax]
                                    const total_items = dist.reduce((s, c) => s + c, 0)

                                    return (
                                        <div key={ax} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 w-full md:w-auto">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{a.emoji}</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{a.label}</p>
                                                        <p className="text-xs text-slate-400">{scoreLabel(avg)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-extrabold" style={{ color: a.color }}>{avg.toFixed(1)}</p>
                                                    <p className="text-[10px] text-slate-400">de 5</p>
                                                </div>
                                            </div>

                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${(avg / 5) * 100}%`, backgroundColor: a.color }} />
                                            </div>

                                            <div className="space-y-1.5">
                                                {[
                                                    { score: 5, label: "Lo hago excelente", color: "#22c55e" },
                                                    { score: 4, label: "Lo hago bien",       color: "#3b82f6" },
                                                    { score: 3, label: "A veces lo logro",   color: "#eab308" },
                                                    { score: 2, label: "Me cuesta un poco",  color: "#f97316" },
                                                    { score: 1, label: "Me cuesta mucho",    color: "#ef4444" },
                                                ].map(opt => {
                                                    const count = dist[opt.score - 1]
                                                    const pct = total_items ? Math.round((count / total_items) * 100) : 0
                                                    return (
                                                        <div key={opt.score} className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 w-3 text-right shrink-0">{opt.score}</span>
                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: opt.color }} />
                                                            </div>
                                                            <span className="text-[10px] font-semibold text-slate-500 w-6 shrink-0">{count}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}


            </div>
        </main>
    )
}
