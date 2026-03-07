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

    if (studentIds.length > 0) {
        const [
            { data: paecList },
            { data: decList },
            { data: convList }
        ] = await Promise.all([
            supabase.from("paec").select("student_id").eq("active", true).in("student_id", studentIds),
            supabase.from("incidents").select("student_id").in("student_id", studentIds),
            supabase.from("convivencia_record_students").select("student_id").in("student_id", studentIds)
        ])

            ; (paecList ?? []).forEach(p => paecCountMap.set(p.student_id, (paecCountMap.get(p.student_id) || 0) + 1))
            ; (decList ?? []).forEach(d => decCountMap.set(d.student_id, (decCountMap.get(d.student_id) || 0) + 1))
            ; (convList ?? []).forEach(c => convCountMap.set(c.student_id, (convCountMap.get(c.student_id) || 0) + 1))
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
                />
            </div>
        </main>
    )
}
