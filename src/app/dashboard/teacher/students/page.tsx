import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, ArrowLeft } from 'lucide-react'
import TeacherBottomNav from '@/components/TeacherBottomNav'
import Link from 'next/link'

export default async function StudentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch Teacher's Courses
    const { data: teacherCourses } = await supabase
        .from('teacher_courses')
        .select(`
            id,
            course:courses(
                id,
                name,
                grade
            )
        `)
        .eq('teacher_id', user.id)

    const courses = teacherCourses?.map(tc => tc.course).filter(Boolean) || []
    const courseIds = courses.map((c: any) => c.id).filter(Boolean)

    // Fetch Students enrolled in teacher's courses
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
            id,
            student:profiles!enrollments_student_id_fkey(
                id,
                full_name,
                avatar_url
            ),
            course:courses(
                id,
                name,
                grade
            )
        `)
        .in('course_id', courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000'])

    // Group students by course
    const studentsByCourse: Record<string, any[]> = {}
    enrollments?.forEach((enrollment: any) => {
        const courseName = enrollment.course?.name || 'Sin curso'
        if (!studentsByCourse[courseName]) {
            studentsByCourse[courseName] = []
        }
        if (enrollment.student) {
            studentsByCourse[courseName].push({
                ...enrollment.student,
                courseId: enrollment.course?.id
            })
        }
    })

    const totalStudents = enrollments?.length || 0

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-32 pb-24 md:pb-6">
            <TeacherBottomNav />

            {/* Header */}
            <header className="p-6 bg-gradient-to-br from-white to-[#F8F9FA] shadow-sm mb-6 border-b-2 border-gray-200">
                <Link href="/dashboard/teacher" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3">
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>
                <h1 className="text-2xl font-bold text-[#475569] flex items-center gap-2">
                    <Users className="text-purple-500" />
                    Mis Estudiantes
                </h1>
                <p className="text-[#64748B]">Lista de estudiantes en tus cursos</p>
            </header>

            <main className="px-6 space-y-6">
                {/* Stats */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-600 mb-1">Total de estudiantes</p>
                    <p className="text-3xl font-bold text-purple-600">{totalStudents}</p>
                    <p className="text-xs text-gray-500 mt-1">en {courses.length} {courses.length === 1 ? 'curso' : 'cursos'}</p>
                </div>

                {/* Students by Course */}
                {Object.entries(studentsByCourse).map(([courseName, students]) => (
                    <section key={courseName}>
                        <h2 className="font-bold text-[#475569] mb-3 text-lg">{courseName}</h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            {students.map((student: any) => (
                                <div
                                    key={student.id}
                                    className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                                            {student.full_name?.charAt(0).toUpperCase() || 'E'}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-[#475569]">{student.full_name || 'Estudiante'}</h3>
                                            <div className="flex gap-2 mt-2">
                                                <Link
                                                    href={`/dashboard/teacher/observations?student=${student.id}`}
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    Ver observaciones
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {/* Empty State */}
                {totalStudents === 0 && (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <Users size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium text-gray-500">No hay estudiantes asignados</p>
                        <p className="text-sm text-gray-400 mt-1">Los estudiantes de tus cursos aparecerán aquí</p>
                    </div>
                )}
            </main>
        </div>
    )
}
