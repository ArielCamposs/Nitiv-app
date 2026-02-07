'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Loader2, UserMinus } from 'lucide-react'
import Link from 'next/link'
import { getCourseById } from '../actions'
import AdminBottomNav from '@/components/AdminBottomNav'

interface Student {
    id: string
    full_name: string
}

interface Enrollment {
    id: string
    student_id: string
    profiles: Student
}

interface Course {
    id: string
    name: string
    grade: string
    created_at: string
    enrollments: Enrollment[]
}

export default function CourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [course, setCourse] = useState<Course | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        loadCourse()
    }, [])

    const loadCourse = async () => {
        try {
            const result = await getCourseById(resolvedParams.id)
            if (result.course) {
                setCourse(result.course)
            } else if (result.error) {
                setError(result.error)
            }
        } catch (error) {
            console.error('Error loading course:', error)
            setError('Error al cargar curso')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        )
    }

    if (error || !course) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
                <div className="max-w-4xl mx-auto p-6">
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-600 font-semibold">{error || 'Curso no encontrado'}</p>
                        <Link
                            href="/dashboard/admin/courses"
                            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            Volver a Cursos
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const students = course.enrollments?.map(e => e.profiles) || []

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard/admin/courses"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Volver a Cursos
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[#475569] mb-2">{course.name}</h1>
                            <div className="flex items-center gap-3 text-gray-600">
                                <Users size={20} />
                                <span className="font-medium">{students.length} estudiantes inscritos</span>
                            </div>
                        </div>
                        <Link
                            href={`/dashboard/admin/courses/${course.id}/edit`}
                            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
                        >
                            Editar Curso
                        </Link>
                    </div>
                </div>

                {/* Students List */}
                <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900">Estudiantes Inscritos</h2>
                    </div>

                    {students.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="mx-auto mb-4 text-gray-400" size={48} />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No hay estudiantes inscritos</h3>
                            <p className="text-gray-600 mb-6">
                                Este curso aún no tiene estudiantes. Puedes editar el curso para agregar estudiantes.
                            </p>
                            <Link
                                href={`/dashboard/admin/courses/${course.id}/edit`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                            >
                                Editar Curso
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {students.map((student, index) => (
                                <div
                                    key={student.id}
                                    className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{student.full_name}</p>
                                            <p className="text-sm text-gray-500">Estudiante</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/dashboard/admin/users/${student.id}/edit`}
                                        className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
                                    >
                                        Ver Perfil
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AdminBottomNav />
        </div>
    )
}
