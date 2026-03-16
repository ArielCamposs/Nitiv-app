import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { type CourseWithSessions, type SessionInfo } from "@/components/radar/RadarManagerClient"
import { RadarAdminTabs, type CourseAxisStats, type StudentAxisStats } from "@/components/radar/RadarAdminTabs"
import { Radar } from "lucide-react"
import type { RadarPeriod } from "@/actions/radar"

export default async function DuplaRadarPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect("/login")

    const { data: profile } = await supabase
        .from("users").select("role, institution_id").eq("id", user.id).single()
    if (!profile?.institution_id || profile.role !== "dupla") return redirect("/dupla")

    const iid = profile.institution_id

    const [{ data: courses }, { data: sessions }, { data: allResponsesRaw }, { data: students }] = await Promise.all([
        supabase
            .from("courses")
            .select("id, name, section")
            .eq("institution_id", iid)
            .eq("active", true)
            .order("name"),
        supabase
            .from("radar_sessions")
            .select("id, course_id, period, active, activated_at")
            .eq("institution_id", iid)
            .order("activated_at", { ascending: false }),
        supabase
            .from("radar_responses")
            .select("id, session_id, student_id")
            .eq("institution_id", iid),
        supabase
            .from("students")
            .select("id, name, last_name, course_id")
            .eq("institution_id", iid),
    ])

    const allResponses = allResponsesRaw ?? []
    const responseIds = allResponses.map(r => r.id)

    const { data: allItems } = responseIds.length
        ? await supabase
            .from("radar_response_items")
            .select("casel_axis, score, response_id")
            .in("response_id", responseIds)
        : { data: [] as { casel_axis: string; score: number; response_id: string }[] }

    // Count responses per session
    const countBySession = new Map<string, number>()
    for (const r of allResponses) {
        countBySession.set(r.session_id, (countBySession.get(r.session_id) ?? 0) + 1)
    }

    // Estadísticas globales por eje (sobre todos los cursos con respuestas)
    const AXES: ("ac" | "ag" | "cs" | "hr" | "td")[] = ["ac", "ag", "cs", "hr", "td"]
    const globalAvg: Partial<Record<string, number>> = {}
    const distribution: Partial<Record<string, number[]>> = {}
    for (const ax of AXES) {
        const vals = (allItems ?? []).filter(i => i.casel_axis === ax).map(i => i.score as number)
        if (vals.length) {
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length
            globalAvg[ax] = Math.round(avg * 10) / 10
            const dist = [0, 0, 0, 0, 0]
            for (const v of vals) {
                const idx = Math.round(v) - 1
                if (idx >= 0 && idx < dist.length) dist[idx]++
            }
            distribution[ax] = dist
        }
    }

    // Estadísticas por curso
    const responseById = new Map((allResponses ?? []).map(r => [r.id, r as { id: string; session_id: string }]))
    const sessionById = new Map((sessions ?? []).map(s => [s.id, s as { id: string; course_id: string }]))
    const courseMeta = new Map((courses ?? []).map(c => [c.id, c as { id: string; name: string; section: string | null }]))

    const perCourseAgg = new Map<string, {
        sums: Record<string, number>
        counts: Record<string, number>
        responseCount: number
    }>()

    for (const item of allItems ?? []) {
        const resp = responseById.get((item as any).response_id)
        if (!resp) continue
        const sess = sessionById.get(resp.session_id)
        if (!sess) continue
        const courseId = sess.course_id
        if (!courseId) continue
        const axis = item.casel_axis as string
        const score = Number(item.score)
        if (!AXES.includes(axis as any)) continue
        let agg = perCourseAgg.get(courseId)
        if (!agg) {
            agg = {
                sums: { ac: 0, ag: 0, cs: 0, hr: 0, td: 0 },
                counts: { ac: 0, ag: 0, cs: 0, hr: 0, td: 0 },
                responseCount: 0,
            }
            perCourseAgg.set(courseId, agg)
        }
        agg.sums[axis] += score
        agg.counts[axis] += 1
    }

    // Contar respuestas por curso a partir de responses/sessions
    for (const resp of allResponses) {
        const sess = sessionById.get(resp.session_id)
        if (!sess || !sess.course_id) continue
        const courseId = sess.course_id
        const agg = perCourseAgg.get(courseId)
        if (agg) agg.responseCount += 1
    }

    const courseStats: CourseAxisStats[] = Array.from(perCourseAgg.entries()).map(([courseId, agg]) => {
        const meta = courseMeta.get(courseId)
        const avgByAxis: Partial<Record<string, number>> = {}
        let overallSum = 0
        let overallCount = 0
        for (const ax of AXES) {
            const c = agg.counts[ax]
            if (c > 0) {
                const avg = agg.sums[ax] / c
                const rounded = Math.round(avg * 10) / 10
                avgByAxis[ax] = rounded
                overallSum += avg
                overallCount += 1
            }
        }
        const overallAvg = overallCount ? Math.round((overallSum / overallCount) * 10) / 10 : 0
        return {
            courseId,
            courseName: meta ? meta.name : "Curso",
            section: meta ? meta.section : null,
            responseCount: agg.responseCount,
            avgByAxis,
            overallAvg,
        }
    }).sort((a, b) => b.overallAvg - a.overallAvg)

    // Build courses with sessions
    // Estadísticas por estudiante (para detectar quienes requieren mayor atención)
    const studentMeta = new Map((students ?? []).map(s => [s.id, s as { id: string; name: string; last_name: string | null; course_id: string | null }]))

    const perStudentAgg = new Map<string, {
        sums: Record<string, number>
        counts: Record<string, number>
    }>()

    for (const item of allItems ?? []) {
        const resp = responseById.get((item as any).response_id)
        if (!resp || !resp.student_id) continue
        const studentId = resp.student_id as string
        const axis = item.casel_axis as string
        const score = Number(item.score)
        if (!AXES.includes(axis as any)) continue
        let agg = perStudentAgg.get(studentId)
        if (!agg) {
            agg = {
                sums: { ac: 0, ag: 0, cs: 0, hr: 0, td: 0 },
                counts: { ac: 0, ag: 0, cs: 0, hr: 0, td: 0 },
            }
            perStudentAgg.set(studentId, agg)
        }
        agg.sums[axis] += score
        agg.counts[axis] += 1
    }

    const atRiskStudents: StudentAxisStats[] = Array.from(perStudentAgg.entries()).map(([studentId, agg]) => {
        const meta = studentMeta.get(studentId)
        const course = meta?.course_id ? courseMeta.get(meta.course_id) : null
        const avgByAxis: Partial<Record<string, number>> = {}
        let overallSum = 0
        let overallCount = 0
        for (const ax of AXES) {
            const c = agg.counts[ax]
            if (c > 0) {
                const avg = agg.sums[ax] / c
                const rounded = Math.round(avg * 10) / 10
                avgByAxis[ax] = rounded
                overallSum += avg
                overallCount += 1
            }
        }
        const overallAvg = overallCount ? Math.round((overallSum / overallCount) * 10) / 10 : 0
        return {
            studentId,
            fullName: meta ? `${meta.name} ${meta.last_name ?? ""}`.trim() : "Estudiante",
            courseName: course ? course.name : "Sin curso",
            section: course ? course.section : null,
            avgByAxis,
            overallAvg,
        }
    })
        // Solo consideramos estudiantes con datos en al menos 3 ejes, para más robustez
        .filter(s => Object.keys(s.avgByAxis).length >= 3)
        // Orden ascendente: más bajo primero -> más atención
        .sort((a, b) => a.overallAvg - b.overallAvg)

    const coursesWithSessions: CourseWithSessions[] = (courses ?? []).map(c => ({
        id: c.id,
        name: c.name,
        section: c.section,
        sessions: (sessions ?? [])
            .filter(s => s.course_id === c.id)
            .map(s => ({
                id: s.id,
                period: s.period as RadarPeriod,
                active: s.active,
                activated_at: s.activated_at,
                response_count: countBySession.get(s.id) ?? 0,
            } satisfies SessionInfo)),
    }))

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Radar className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-semibold text-slate-900">Radar de Competencias</h1>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        Activa el cuestionario por curso y período. Los estudiantes solo podrán responder cuando esté activo.
                    </p>
                </div>

                <RadarAdminTabs
                    courses={coursesWithSessions}
                    institutionId={iid}
                    role="dupla"
                    globalAvg={globalAvg}
                    distribution={distribution}
                    courseStats={courseStats}
                    atRiskStudents={atRiskStudents.slice(0, 5)}
                />
            </div>
        </main>
    )
}
