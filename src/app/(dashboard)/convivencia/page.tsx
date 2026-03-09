import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getActiveAlerts } from "@/lib/utils/get-alerts"
import { ConvivenciaDashboardClient, ConvivenciaStats } from "@/components/convivencia/ConvivenciaDashboardClient"

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

    // Parallel fetch
    const [
        { data: students },
        alerts,
        { data: incidents },
        { data: paecs },
        { data: courses },
    ] = await Promise.all([
        supabase.from("students").select("id, name, last_name, course_id").eq("institution_id", iid).eq("active", true),
        getActiveAlerts(),
        supabase.from("incidents").select("id, folio, student_id, type, severity, incident_date, resolved, end_date").eq("institution_id", iid).gte("incident_date", monthsAgo12.toISOString().split("T")[0]),
        supabase.from("paec").select("id").eq("institution_id", iid).eq("active", true),
        supabase.from("courses").select("id, name, section").eq("institution_id", iid).eq("active", true),
    ])

    const convivenciaTypes = ["dec_repetido", "registros_negativos"]
    const filteredAlerts = alerts.filter((a: any) => convivenciaTypes.includes(a.type))

    const activePAECs = paecs?.length ?? 0
    const totalStudents = students?.length ?? 0
    const activeAlerts = filteredAlerts.length

    const allIncidents = incidents ?? []
    const openDecs = allIncidents.filter(i => !i.resolved)

    // ── DECs por tipo (solo no resueltos o todos? Asumamos todos los de los ultimes 6 meses para estadistica o los abiertos? Mejor SOLO ABIERTOS para la torta/barras)
    const typeCount: Record<string, number> = {}
    const severityCount: Record<string, number> = {}

    for (const d of allIncidents) {
        typeCount[d.type] = (typeCount[d.type] ?? 0) + 1
        severityCount[d.severity] = (severityCount[d.severity] ?? 0) + 1
    }

    // ── Tasa de resolución ───────────────────────────────────────────────────────
    const totalPeriodDecs = allIncidents.length
    const resolvedDecs = allIncidents.filter(d => d.resolved).length
    const resolutionRate = totalPeriodDecs > 0 ? Math.round((resolvedDecs / totalPeriodDecs) * 100) : 0

    const LABEL_TYPE: Record<string, string> = {
        pelea: "Pelea/Agresión Física",
        bullying: "Acoso escolar (Bullying)",
        ciberacoso: "Ciberacoso (Cyberbullying)",
        drogas: "Posesión/uso de drogas",
        alcohol: "Posesión/uso de alcohol",
        armas: "Porte de armas",
        robo: "Robo o hurto",
        insultos: "Agresión verbal a pares",
        falta_respeto: "Falta de respeto a docentes",
        danio_propiedad: "Daño a propiedad del colegio",
        acoso_sexual: "Acoso sexual",
        fuga: "Fuga del establecimiento",
        incumplimiento: "Incumplimiento reiterado de normas",
        redes_sociales: "Mal uso de redes sociales institucional",
        otro: "Otro",
    }
    const COLORS_TYPE: string[] = ["#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]

    const decsByType = Object.entries(typeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count], i) => ({
            name: LABEL_TYPE[type] ?? type,
            count,
            color: COLORS_TYPE[i % COLORS_TYPE.length],
        }))

    const SEVERITY_COLOR: Record<string, string> = { leve: "#3b82f6", grave: "#f97316", muy_grave: "#ef4444" }
    const SEVERITY_LABEL: Record<string, string> = { leve: "Leve", grave: "Grave", muy_grave: "Muy grave" }

    const decsBySeverity = Object.entries(severityCount).map(([sev, count]) => ({
        name: SEVERITY_LABEL[sev] ?? sev,
        count,
        color: SEVERITY_COLOR[sev] ?? "#94a3b8"
    }))

    // ── Tendencia 12 meses ──
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const monthlyTrendMap: Record<string, { decs: number; cierres: number; label: string }> = {}

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now)
        d.setMonth(now.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyTrendMap[key] = { decs: 0, cierres: 0, label: monthNames[d.getMonth()] }
    }

    for (const d of allIncidents) {
        const dDate = new Date(d.incident_date)
        const dKey = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`
        if (monthlyTrendMap[dKey]) monthlyTrendMap[dKey].decs++

        if (d.resolved && d.end_date) {
            const eDate = new Date(d.end_date)
            const eKey = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`
            if (monthlyTrendMap[eKey]) monthlyTrendMap[eKey].cierres++
        }
    }
    const monthlyTrend = Object.values(monthlyTrendMap).map(v => ({ mes: v.label, decs: v.decs, cierres: v.cierres }))

    // ── DECs recientes ──
    const studentsMap = Object.fromEntries((students ?? []).map(s => [s.id, s]))
    const coursesMap = Object.fromEntries((courses ?? []).map(c => [c.id, c]))

    // ── Cursos con más incidentes (top 3) ────────────────────────────────────────
    const courseIncidentCount: Record<string, number> = {}
    for (const d of allIncidents) {
        const st = studentsMap[d.student_id] as any
        if (st?.course_id) {
            courseIncidentCount[st.course_id] = (courseIncidentCount[st.course_id] ?? 0) + 1
        }
    }
    const topCourses = Object.entries(courseIncidentCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([courseId, count]) => {
            const c = coursesMap[courseId] as any
            return { courseName: c ? `${c.name}${c.section ? " " + c.section : ""}` : "Sin curso", count }
        })

    const recentDecs = openDecs
        .sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())
        .slice(0, 5)
        .map(d => {
            const st = studentsMap[d.student_id] as any
            const co = st ? coursesMap[st.course_id ?? ""] as any : null
            return {
                id: d.id,
                folio: d.folio,
                studentName: st ? `${st.name} ${st.last_name}` : "Estudiante",
                courseName: co ? `${co.name}${co.section ? " " + co.section : ""}` : "Sin curso",
                severity: d.severity,
                type: LABEL_TYPE[d.type] ?? d.type,
                incident_date: d.incident_date,
            }
        })

    const stats: ConvivenciaStats = {
        openDecs: openDecs.length,
        activeAlerts,
        activePaecs: activePAECs,
        totalStudents,
        decsByType,
        decsBySeverity,
        monthlyTrend,
        recentDecs,
        resolutionRate,
        topCourses,
        totalPeriodDecs,
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

                <ConvivenciaDashboardClient stats={stats} />
            </div>
        </main>
    )
}
