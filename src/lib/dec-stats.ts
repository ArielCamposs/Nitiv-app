import { createClient } from "@/lib/supabase/server"

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
// DEC solo usa dos severidades: moderada (Etapa 2) y severa (Etapa 3)
const SEVERITY_COLOR: Record<string, string> = { moderada: "#f59e0b", severa: "#f43f5e" }
const SEVERITY_LABEL: Record<string, string> = { moderada: "Etapa 2 — Moderada", severa: "Etapa 3 — Severa" }
const severityOrder = ["severa", "moderada"]

export interface DecStatsResult {
    decsByType: { name: string; count: number; color: string }[]
    decsBySeverity: { name: string; count: number; color: string }[]
    monthlyTrend: { mes: string; decs: number; cierres: number }[]
    recentDecs: { id: string; folio: string; studentName: string; courseName: string; severity: string; type: string; incident_date: string }[]
    resolutionRate: number
    topCourses: { courseName: string; count: number }[]
    totalPeriodDecs: number
    topConductTypes: { name: string; count: number }[]
    topTriggers: { name: string; count: number }[]
    topActions: { name: string; count: number }[]
}

export async function getDecStats(institutionId: string): Promise<DecStatsResult> {
    const supabase = await createClient()
    const now = new Date()
    const year = now.getFullYear()
    // Tendencia: desde enero del año actual, 12 meses del año en curso
    const fromStr = `${year}-01-01`

    const [{ data: incidents }, { data: students }, { data: courses }] = await Promise.all([
        supabase
            .from("incidents")
            .select("id, folio, student_id, type, severity, incident_date, resolved, end_date, conduct_types, triggers, actions_taken")
            .eq("institution_id", institutionId)
            .gte("incident_date", fromStr),
        supabase.from("students").select("id, name, last_name, course_id").eq("institution_id", institutionId).eq("active", true),
        supabase.from("courses").select("id, name, section").eq("institution_id", institutionId).eq("active", true),
    ])

    const allIncidents = incidents ?? []
    const typeCount: Record<string, number> = {}
    const severityCount: Record<string, number> = {}
    for (const d of allIncidents) {
        if (d.type != null && String(d.type).trim() !== "") {
            typeCount[d.type] = (typeCount[d.type] ?? 0) + 1
        }
        if (d.severity != null && String(d.severity).trim() !== "") {
            severityCount[d.severity] = (severityCount[d.severity] ?? 0) + 1
        }
    }

    const totalPeriodDecs = allIncidents.length
    const resolvedCount = allIncidents.filter(d => d.resolved).length
    const resolutionRate = totalPeriodDecs > 0 ? Math.round((resolvedCount / totalPeriodDecs) * 100) : 0

    const decsByType = Object.entries(typeCount)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([type, count], i) => ({
            name: LABEL_TYPE[type] ?? type,
            count,
            color: COLORS_TYPE[i % COLORS_TYPE.length],
        }))

    // Solo las dos severidades DEC: severa y moderada, con sus colores
    const decsBySeverity = severityOrder.map(sev => ({
        name: SEVERITY_LABEL[sev] ?? sev,
        count: severityCount[sev] ?? 0,
        color: SEVERITY_COLOR[sev] ?? "#94a3b8"
    }))

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    // Tendencia: 12 meses del año en curso (enero a diciembre)
    const monthlyTrendMap: Record<string, { decs: number; cierres: number; label: string }> = {}
    for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, "0")}`
        monthlyTrendMap[key] = { decs: 0, cierres: 0, label: monthNames[m - 1] }
    }
    for (const d of allIncidents) {
        const dDate = new Date(d.incident_date)
        const dKey = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, "0")}`
        if (monthlyTrendMap[dKey]) monthlyTrendMap[dKey].decs++
        if (d.resolved && d.end_date) {
            const eDate = new Date(d.end_date)
            const eKey = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, "0")}`
            if (monthlyTrendMap[eKey]) monthlyTrendMap[eKey].cierres++
        }
    }
    const monthlyTrend = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
        const key = `${year}-${String(m).padStart(2, "0")}`
        const v = monthlyTrendMap[key]
        return { mes: v.label, decs: v.decs, cierres: v.cierres }
    })

    const studentsMap = Object.fromEntries((students ?? []).map(s => [s.id, s]))
    const coursesMap = Object.fromEntries((courses ?? []).map(c => [c.id, c]))
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

    const conductCount: Record<string, number> = {}
    const triggerCount: Record<string, number> = {}
    const actionCount: Record<string, number> = {}
    for (const d of allIncidents) {
        const conducts = (d as any).conduct_types as string[] | null | undefined
        if (Array.isArray(conducts)) {
            for (const c of conducts) {
                if (c && typeof c === "string") conductCount[c] = (conductCount[c] ?? 0) + 1
            }
        }
        const triggers = (d as any).triggers as string[] | null | undefined
        if (Array.isArray(triggers)) {
            for (const t of triggers) {
                if (t && typeof t === "string") triggerCount[t] = (triggerCount[t] ?? 0) + 1
            }
        }
        const actions = (d as any).actions_taken as string[] | null | undefined
        if (Array.isArray(actions)) {
            for (const a of actions) {
                if (a && typeof a === "string") actionCount[a] = (actionCount[a] ?? 0) + 1
            }
        }
    }
    const topConductTypes = Object.entries(conductCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    const topTriggers = Object.entries(triggerCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    const topActions = Object.entries(actionCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))

    const openDecs = allIncidents.filter(i => !i.resolved)
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

    return {
        decsByType,
        decsBySeverity,
        monthlyTrend,
        recentDecs,
        resolutionRate,
        topCourses,
        totalPeriodDecs,
        topConductTypes,
        topTriggers,
        topActions,
    }
}
