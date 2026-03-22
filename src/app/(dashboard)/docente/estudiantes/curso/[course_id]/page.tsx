import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CourseStudentsClient } from "@/components/students/CourseStudentsClient"

interface Props {
    params: Promise<{ course_id: string }>
}

export default async function DocenteCourseStudentsPage(props: Props) {
    const params = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    // Verificar que el docente tenga asignado este curso
    const { data: courseTeacher } = await supabase
        .from("course_teachers")
        .select("courses(id, name, level, section)")
        .eq("teacher_id", user.id)
        .eq("course_id", params.course_id)
        .single()

    if (!courseTeacher) {
        redirect("/docente/estudiantes")
    }

    const courseDetails = courseTeacher.courses as any

    // Obtener estudiantes del curso
    const { data: students } = await supabase
        .from("students")
        .select("id, name, last_name, rut, course_id")
        .eq("course_id", params.course_id)
        .eq("active", true)
        .order("last_name")

    const studentIds = (students ?? []).map(s => s.id)

    let paecCountMap = new Map<string, number>()
    let decCountMap = new Map<string, number>()
    let convCountMap = new Map<string, number>()

    let climaAula = "Sin datos"
    let radarCompetencia = "Sin datos"
    let casosConvivencia = 0
    let emotionsDistribution: { name: string; value: number; color: string }[] = []
    let emotionsTrend: { date: string; score: number }[] = []
    let radarAxes: { axis: string; score: number }[] = []
    let totalPaec = 0
    let totalDec = 0

    if (studentIds.length > 0) {
        const [
            { data: paecList },
            { data: decList },
            { data: convList },
            { data: emotionalLogs },
            { data: radarResponses }
        ] = await Promise.all([
            supabase.from("paec").select("id, student_id").eq("active", true).in("student_id", studentIds),
            supabase.from("incidents").select("id, student_id").in("student_id", studentIds),
            supabase.from("convivencia_record_students").select("student_id, record_id").in("student_id", studentIds),
            supabase.from("emotional_logs").select("emotion, created_at").in("student_id", studentIds).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
            supabase.from("radar_responses").select("id").in("student_id", studentIds)
        ])

            ; (paecList ?? []).forEach(p => paecCountMap.set(p.student_id, (paecCountMap.get(p.student_id) || 0) + 1))
            ; (decList ?? []).forEach(d => decCountMap.set(d.student_id, (decCountMap.get(d.student_id) || 0) + 1))
            ; (convList ?? []).forEach(c => convCountMap.set(c.student_id, (convCountMap.get(c.student_id) || 0) + 1))

        totalPaec = new Set((paecList ?? []).map(p => p.id)).size
        totalDec = new Set((decList ?? []).map(d => d.id)).size

        if (emotionalLogs && emotionalLogs.length > 0) {
            const emotionScores: Record<string, number> = {
                muy_bien: 5, bien: 4, neutral: 3, mal: 2, muy_mal: 1
            }
            const emotionColors: Record<string, string> = {
                muy_bien: "#10b981", bien: "#34d399", neutral: "#94a3b8", mal: "#f87171", muy_mal: "#e11d48"
            }
            
            const avg = emotionalLogs.reduce((acc: number, log: any) => acc + (emotionScores[log.emotion] || 3), 0) / emotionalLogs.length
            if (avg >= 4.5) climaAula = "Muy positivo"
            else if (avg >= 3.5) climaAula = "Positivo"
            else if (avg >= 2.5) climaAula = "Neutral"
            else if (avg >= 1.5) climaAula = "Negativo"
            else climaAula = "Muy negativo"

            // Distribución
            const counts = emotionalLogs.reduce((acc: any, log: any) => {
                acc[log.emotion] = (acc[log.emotion] || 0) + 1
                return acc
            }, {})
            emotionsDistribution = Object.keys(counts).map(key => ({
                name: key.replace("_", " ").toUpperCase(),
                value: counts[key],
                color: emotionColors[key] || "#94a3b8"
            }))

            // Tendencia
            const trendMap = emotionalLogs.reduce((acc: any, log: any) => {
                const date = new Date(log.created_at).toISOString().split('T')[0]
                if (!acc[date]) acc[date] = { total: 0, count: 0 }
                acc[date].total += emotionScores[log.emotion] || 3
                acc[date].count += 1
                return acc
            }, {})
            emotionsTrend = Object.keys(trendMap).sort().map(date => ({
                date: date.slice(5), // MM-DD
                score: Math.round((trendMap[date].total / trendMap[date].count) * 10) / 10
            }))
        }

        if (radarResponses && radarResponses.length > 0) {
            const responseIds = radarResponses.map(r => r.id)
            const { data: radarItems } = await supabase
                .from("radar_response_items")
                .select("casel_axis, score")
                .in("response_id", responseIds)
            
            if (radarItems && radarItems.length > 0) {
                const avg = radarItems.reduce((acc: number, item: any) => acc + item.score, 0) / radarItems.length
                radarCompetencia = `${avg.toFixed(1)} / 5.0`

                const axisMap = radarItems.reduce((acc: any, item: any) => {
                    if (!acc[item.casel_axis]) acc[item.casel_axis] = { total: 0, count: 0 }
                    acc[item.casel_axis].total += item.score
                    acc[item.casel_axis].count += 1
                    return acc
                }, {})
                radarAxes = Object.keys(axisMap).map(axis => ({
                    axis,
                    score: Math.round((axisMap[axis].total / axisMap[axis].count) * 10) / 10
                }))
            }
        }

        if (convList && convList.length > 0) {
            const uniqueCases = new Set(convList.map((c: any) => c.record_id))
            casosConvivencia = uniqueCases.size
        }
    }

    const mappedStudents = (students ?? []).map(s => ({
        ...s,
        paecCount: paecCountMap.get(s.id) || 0,
        decCount: decCountMap.get(s.id) || 0,
        convivenciaCount: convCountMap.get(s.id) || 0
    }))

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <CourseStudentsClient
                    course={courseDetails}
                    students={mappedStudents}
                    baseUrl="/docente/estudiantes"
                    stats={{ climaAula, radarCompetencia, casosConvivencia, emotionsDistribution, emotionsTrend, radarAxes, totalPaec, totalDec }}
                />
            </div>
        </main>
    )
}
