import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

async function getData() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .single()

    if (!profile?.institution_id) redirect("/login")

    const { data: courses } = await supabase
        .from("courses")
        .select("id, name, level, section")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .order("name")

    const courseIds = (courses ?? []).map(c => c.id)

    const { data: students } = courseIds.length
        ? await supabase
            .from("students")
            .select("id, name, last_name, rut, course_id")
            .in("course_id", courseIds)
            .eq("active", true)
            .order("last_name")
        : { data: [] }

    const { data: activeAlerts } = await supabase
        .from("alerts")
        .select("student_id")
        .eq("institution_id", profile.institution_id)
        .eq("resolved", false)

    const alertSet = new Set((activeAlerts ?? []).map(a => a.student_id))

    return {
        courses: (courses ?? []).map(c => ({
            ...c,
            students: (students ?? [])
                .filter(s => s.course_id === c.id)
                .map(s => ({ ...s, hasAlert: alertSet.has(s.id) })),
        })),
    }
}

export default async function DuplaEstudiantesPage() {
    const { courses } = await getData()

    const totalStudents = courses.reduce((acc, c) => acc + c.students.length, 0)

    const basicCourses = courses.filter(c => !/medio|media|1°m|2°m|3°m|4°m|i medio|ii medio|iii medio|iv medio/i.test(c.name))
    const highCourses = courses.filter(c => !basicCourses.includes(c))

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Estudiantes</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {totalStudents} estudiante{totalStudents !== 1 ? "s" : ""} en {courses.length} curso{courses.length !== 1 ? "s" : ""}
                    </p>
                </div>

                {courses.length === 0 && (
                    <p className="text-slate-400 text-sm">No hay cursos activos en la institución.</p>
                )}

                <div className="space-y-6">
                    {basicCourses.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50/70 px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-indigo-700 uppercase shadow-sm">
                                Educación básica
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {basicCourses.map(course => (
                                    <Link key={course.id} href={`/dupla/estudiantes/curso/${course.id}`}>
                                        <Card className="cursor-pointer border border-indigo-200 bg-white/80 hover:shadow-lg hover:bg-indigo-50/60 transition-all rounded-2xl h-full">
                                            <CardContent className="flex flex-col justify-between p-5 h-full">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-slate-900">
                                                            {course.name}{course.section ? ` ${course.section}` : ""}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {course.students.length} estudiante{course.students.length !== 1 ? "s" : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center text-xs font-medium text-indigo-600 group">
                                                    Ver curso <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {highCourses.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50/70 px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-violet-700 uppercase shadow-sm">
                                Educación media
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {highCourses.map(course => (
                                    <Link key={course.id} href={`/dupla/estudiantes/curso/${course.id}`}>
                                        <Card className="cursor-pointer border border-violet-200 bg-white/80 hover:shadow-lg hover:bg-violet-50/60 transition-all rounded-2xl h-full">
                                            <CardContent className="flex flex-col justify-between p-5 h-full">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-slate-900">
                                                            {course.name}{course.section ? ` ${course.section}` : ""}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {course.students.length} estudiante{course.students.length !== 1 ? "s" : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center text-xs font-medium text-indigo-600 group">
                                                    Ver curso <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    )
}
