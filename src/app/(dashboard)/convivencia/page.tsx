import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getActiveAlerts } from "@/lib/utils/get-alerts"
import { getHeatmapData } from "@/lib/data/get-heatmap-data"
import { ConvivenciaDashboardClient, ConvivenciaStats } from "@/components/convivencia/ConvivenciaDashboardClient"
import { RadarDashboardWidget } from "@/components/radar/RadarDashboardWidget"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

export default async function ConvivenciaPage() {
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
    const monthsAgo12 = new Date(now)
    monthsAgo12.setMonth(now.getMonth() - 11)
    monthsAgo12.setDate(1)
    monthsAgo12.setHours(0, 0, 0, 0)

    const oneMonthAgo = new Date(now)
    oneMonthAgo.setMonth(now.getMonth() - 1)
    oneMonthAgo.setHours(0, 0, 0, 0)
    // Parallel fetch (incidents solo para contar DECs abiertos; estadísticas DEC están en /convivencia/dec → Estadísticas)
    const [
        alerts,
        { data: incidents },
        { data: convivenciaRecords },
    ] = await Promise.all([
        getActiveAlerts(),
        supabase.from("incidents").select("id, resolved, incident_date").eq("institution_id", iid).gte("incident_date", monthsAgo12.toISOString().split("T")[0]),
        supabase.from("convivencia_records").select("id, resolved, incident_date").eq("institution_id", iid).gte("incident_date", monthsAgo12.toISOString().split("T")[0]),
    ])

    const convivenciaTypes = ["dec_repetido", "registros_negativos"]
    const filteredAlerts = alerts.filter((a: any) => convivenciaTypes.includes(a.type))

    const allConvivenciaRecords = (convivenciaRecords ?? []) as { resolved: boolean; incident_date: string }[]
    const activeConvivenciaRecords = allConvivenciaRecords.filter((r) => !r.resolved).length
    const totalConvivencia12m = allConvivenciaRecords.length
    const closedConvivencia12m = totalConvivencia12m - activeConvivenciaRecords

    // Casos de convivencia por mes (enero–diciembre del año actual)
    const monthlyMap: Record<string, number> = {}
    for (const rec of allConvivenciaRecords) {
        const d = new Date(rec.incident_date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthlyMap[key] = (monthlyMap[key] ?? 0) + 1
    }
    const monthlyConvivenciaCounts: { monthKey: string; label: string; count: number }[] = []
    const currentYear = now.getFullYear()
    for (let month = 0; month < 12; month++) {
        const d = new Date(currentYear, month, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const label = d.toLocaleDateString("es-CL", { month: "short" })
        monthlyConvivenciaCounts.push({ monthKey: key, label, count: monthlyMap[key] ?? 0 })
    }

    const activeAlerts = filteredAlerts.length

    const allIncidents = (incidents ?? []) as { resolved: boolean; incident_date: string }[]
    const openDecsCount = allIncidents.filter((i) => !i.resolved).length
    const totalDecs12m = allIncidents.length
    const resolvedDecs12m = allIncidents.filter((i) => i.resolved).length

    const decLastMonth = allIncidents.filter((i) => {
        const d = new Date(i.incident_date)
        return d >= oneMonthAgo
    }).length

    // ── Curso con clima de aula más bajo + cursos con registro (getHeatmapData) ──
    let lowestClimateCourse: { courseName: string; score: number; label: string } | null = null
    let coursesWithClimateCount = 0
    try {
        const { courses: heatmapCourses, historyLogs } = await getHeatmapData()
        const scoreByCourseId: Record<string, { sum: number; count: number }> = {}
        const courseIdsWithData = new Set<string>()
        for (const log of historyLogs) {
            const cid = log.course_id
            if (!cid) continue
            courseIdsWithData.add(cid)
            if (!scoreByCourseId[cid]) scoreByCourseId[cid] = { sum: 0, count: 0 }
            scoreByCourseId[cid].sum += ENERGY_SCORE[(log as any).energy_level] ?? 3
            scoreByCourseId[cid].count += 1
        }
        coursesWithClimateCount = courseIdsWithData.size
        const climatePorCurso = heatmapCourses
            .map((c: { course_id: string; courses: { name: string } }) => {
                const { sum, count } = scoreByCourseId[c.course_id] ?? { sum: 0, count: 0 }
                const score = count > 0 ? Math.round((sum / count) * 10) / 10 : 0
                const courseName = c.courses?.name?.trim() ?? c.course_id ?? "Curso"
                const label = score === 0 ? "Sin datos" : score >= 3.5 ? "Regulada" : score >= 2.5 ? "Inquieta" : "Apática/Explosiva"
                return { courseName, score, label, count }
            })
            .filter((x: { score: number; count: number }) => x.score > 0 && x.count > 0)
            .sort((a: { score: number }, b: { score: number }) => a.score - b.score)
        lowestClimateCourse = climatePorCurso.length > 0 ? { courseName: climatePorCurso[0].courseName, score: climatePorCurso[0].score, label: climatePorCurso[0].label } : null
    } catch {
        lowestClimateCourse = null
    }

    const stats: ConvivenciaStats = {
        openDecs: openDecsCount,
        activeAlerts,
        activeConvivenciaRecords,
        lowestClimateCourse,
        decSummary: { total: totalDecs12m, resolved: resolvedDecs12m, lastMonth: decLastMonth },
        convivenciaSummary: { total: totalConvivencia12m, closed: closedConvivencia12m },
        climateSummary: { coursesWithData: coursesWithClimateCount },
        monthlyConvivenciaCounts,
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Dashboard Convivencia Escolar</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Bienvenido/a, <span className="font-medium text-slate-700">{profile.name} {profile.last_name}</span>
                    </p>
                </div>

                {/* Radar activo — posición prominente */}
                <RadarDashboardWidget institutionId={iid} role="convivencia" />

                <ConvivenciaDashboardClient stats={stats} />
            </div>
        </main>
    )
}
