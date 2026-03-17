import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
} from "@/components/ui/card"

async function getStudentsByCourse() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Obtener cursos del docente
    const { data: courseTeachers } = await supabase
        .from("course_teachers")
        .select("course_id, is_head_teacher, courses(id, name, level, section)")
        .eq("teacher_id", user.id)

    if (!courseTeachers?.length) return { courses: [] }

    // Para cada curso obtener estudiantes
    const courseIds = courseTeachers.map((ct) => ct.course_id)

    const { data: students } = await supabase
        .from("students")
        .select("id, name, last_name, rut, course_id")
        .in("course_id", courseIds)
        .eq("active", true)
        .order("last_name")

    return {
        courses: courseTeachers.map((ct) => ({
            ...ct,
            students: students?.filter((s) => s.course_id === ct.course_id) ?? [],
        })),
    }
}

const EMOTION_LABELS: Record<string, { label: string; color: string }> = {
    muy_bien: { label: "Muy bien", color: "bg-emerald-100 text-emerald-700" },
    bien: { label: "Bien", color: "bg-emerald-50 text-emerald-600" },
    neutral: { label: "Neutral", color: "bg-slate-100 text-slate-600" },
    mal: { label: "Mal", color: "bg-rose-100 text-rose-600" },
    muy_mal: { label: "Muy mal", color: "bg-rose-200 text-rose-800" },
}

export default async function EstudiantesDocentePage() {
    const data = await getStudentsByCourse()

    if (!data || !data.courses.length) {
        return (
            <main className="min-h-screen bg-slate-50">
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <p className="text-slate-500">
                        No tienes cursos asignados todavía.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Mis estudiantes
                </h1>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.courses.map((courseData: any) => (
                        <Link key={courseData.course_id} href={`/docente/estudiantes/curso/${courseData.course_id}`}>
                            <Card className="cursor-pointer border border-sky-200 bg-white/80 hover:shadow-lg hover:bg-sky-50/60 transition-all rounded-2xl h-full">
                                <CardContent className="flex flex-col justify-center p-6 h-full">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-800">
                                                {courseData.courses?.name}
                                            </h2>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {courseData.students.length} estudiante{courseData.students.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        {courseData.is_head_teacher && (
                                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 whitespace-nowrap">
                                                Prof. Jefe
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="mt-6 flex items-center text-sm font-medium text-indigo-600 group">
                                        Abrir curso <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    )
}
