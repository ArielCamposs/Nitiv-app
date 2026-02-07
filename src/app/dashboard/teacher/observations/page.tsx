import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, ArrowLeft } from 'lucide-react'
import TeacherBottomNav from '@/components/TeacherBottomNav'
import Link from 'next/link'
import { deleteObservation } from './actions'
import CreateObservationModal from './CreateObservationModal'

type Profile = {
    id: string
    full_name: string | null
}

type CourseLite = {
    id?: string
    name: string | null
}

type Relation<T> = T | T[] | null

type ObservationRow = {
    id: string
    title: string
    content: string
    category: string
    created_at: string
    student: Relation<Profile>
    course: Relation<CourseLite>
}

type TeacherCourseRow = {
    course_id: string
}

type EnrollmentRow = {
    student: Relation<Profile>
    course: Relation<{ id: string; name: string | null }>
}

type StudentUI = {
    id: string
    full_name: string
    courseId?: string
    courseName: string
}

function first<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null
    return Array.isArray(value) ? (value[0] ?? null) : value
}

export default async function ObservationsPage({
    searchParams,
}: {
    searchParams: { student?: string }
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const studentFilter = searchParams.student

    // Fetch observations
    let observationsQuery = supabase
        .from('observations')
        .select(
            `
        id,
        title,
        content,
        category,
        created_at,
        student:profiles!observations_student_id_fkey(
          id,
          full_name
        ),
        course:courses(
          name
        )
      `
        )
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

    if (studentFilter) {
        observationsQuery = observationsQuery.eq('student_id', studentFilter)
    }

    const {
        data: observations,
        error: observationsError,
    } = await observationsQuery.overrideTypes<ObservationRow[], { merge: false }>()

    if (observationsError) {
        throw new Error(observationsError.message)
    }

    // Fetch students in teacher's courses for the form
    const { data: teacherCourses, error: teacherCoursesError } = await supabase
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id)
        .overrideTypes<TeacherCourseRow[], { merge: false }>()

    if (teacherCoursesError) {
        throw new Error(teacherCoursesError.message)
    }

    const courseIds = teacherCourses?.map((tc) => tc.course_id) ?? []

    const enrollments: EnrollmentRow[] =
        courseIds.length === 0
            ? []
            : (
                await supabase
                    .from('enrollments')
                    .select(
                        `
                student:profiles!enrollments_student_id_fkey(
                  id,
                  full_name
                ),
                course:courses(
                  id,
                  name
                )
              `
                    )
                    .in('course_id', courseIds)
                    .overrideTypes<EnrollmentRow[], { merge: false }>()
            ).data ?? []

    const students =
        enrollments
            .map((e) => {
                const student = first(e.student)
                const course = first(e.course)
                if (!student || !student.full_name || !course?.name) return null

                return {
                    id: student.id,
                    full_name: student.full_name,
                    courseId: course.id,
                    courseName: course.name,
                }
            })
            .filter((s): s is Exclude<typeof s, null> => s !== null) ?? []

    // Get unique students
    const uniqueStudents = students.reduce((acc, current) => {
        if (!acc.find((s) => s.id === current.id)) acc.push(current)
        return acc
    }, [] as typeof students)

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-32 pb-24 md:pb-6">
            <TeacherBottomNav />

            {/* Header */}
            <header className="p-6 bg-gradient-to-br from-white to-[#F8F9FA] shadow-sm mb-6 border-b-2 border-gray-200">
                <Link
                    href="/dashboard/teacher"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
                >
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>
                <h1 className="text-2xl font-bold text-[#475569] flex items-center gap-2">
                    <FileText className="text-teal-500" />
                    Observaciones
                </h1>
                <p className="text-[#64748B]">Registra observaciones sobre tus estudiantes</p>
            </header>

            <main className="px-6 space-y-6">
                {/* Stats */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-600 mb-1">Total de observaciones</p>
                    <p className="text-3xl font-bold text-teal-600">{observations?.length || 0}</p>
                </div>

                {/* Observations List */}
                <section>
                    <h2 className="font-bold text-[#475569] mb-3 text-lg">
                        Observaciones Registradas ({observations?.length || 0})
                    </h2>

                    <div className="space-y-3">
                        {observations && observations.length > 0 ? (
                            observations.map((obs) => {
                                const student = first(obs.student)
                                const course = first(obs.course)

                                return (
                                    <div
                                        key={obs.id}
                                        className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span
                                                    className={`
                            text-[10px] uppercase font-bold px-2 py-1 rounded
                            ${obs.category === 'academic'
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : obs.category === 'behavioral'
                                                                ? 'bg-red-100 text-red-600'
                                                                : obs.category === 'social'
                                                                    ? 'bg-green-100 text-green-600'
                                                                    : 'bg-gray-100 text-gray-600'
                                                        }
                          `}
                                                >
                                                    {obs.category === 'academic'
                                                        ? 'Académica'
                                                        : obs.category === 'behavioral'
                                                            ? 'Conductual'
                                                            : obs.category === 'social'
                                                                ? 'Social'
                                                                : 'Otra'}
                                                </span>
                                            </div>

                                            <form action={deleteObservation}>
                                                <input type="hidden" name="observationId" value={obs.id} />
                                                <button type="submit" className="text-xs text-red-600 hover:underline">
                                                    Eliminar
                                                </button>
                                            </form>
                                        </div>

                                        <h3 className="font-bold text-[#475569]">{obs.title}</h3>

                                        <p className="text-sm text-gray-600 mt-1">
                                            <span className="font-medium">{student?.full_name ?? '—'}</span>
                                            {course?.name && <span className="text-gray-400"> • {course.name}</span>}
                                        </p>

                                        <p className="text-sm text-gray-700 mt-2">{obs.content}</p>

                                        <p className="text-xs text-gray-400 mt-2">
                                            {new Date(obs.created_at).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="bg-white rounded-2xl p-12 text-center">
                                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="font-medium text-gray-500">No hay observaciones registradas</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Haz click en el botón + para crear tu primera observación
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <CreateObservationModal students={uniqueStudents} studentFilter={studentFilter} />
            </main>
        </div>
    )
}
