'use client'

import { useEffect, useState } from 'react'
import AdminBottomNav from '@/components/AdminBottomNav'
import { BookOpen, Users, Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { getAllCourses, deleteCourse } from './actions'

interface Course {
    id: string
    name: string
    grade: string
    created_at: string
    enrollments: { count: number }[]
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        loadCourses()
    }, [])

    const loadCourses = async () => {
        setLoading(true)
        try {
            const result = await getAllCourses()
            if (result.courses) {
                setCourses(result.courses)
            }
        } catch (error) {
            console.error('Error loading courses:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (courseId: string) => {
        setDeleting(true)
        const result = await deleteCourse(courseId)

        if (result.error) {
            alert('Error al eliminar curso: ' + result.error)
        } else {
            await loadCourses()
        }

        setDeleting(false)
        setDeleteConfirm(null)
    }

    const getEnrollmentCount = (course: Course) => {
        return course.enrollments?.[0]?.count || 0
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="text-red-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Confirmar Eliminación</h3>
                                <p className="text-gray-600 text-sm">Esta acción no se puede deshacer</p>
                            </div>
                        </div>
                        <p className="text-gray-700 mb-6">
                            ¿Estás seguro de que deseas eliminar este curso? Se eliminarán todas las inscripciones asociadas.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-[#475569] mb-2">Gestión de Cursos</h1>
                        <p className="text-gray-600">Administra cursos y asigna estudiantes</p>
                    </div>
                    <Link
                        href="/dashboard/admin/courses/create"
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <Plus size={20} />
                        Crear Curso
                    </Link>
                </div>

                {/* Courses Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-blue-500" size={40} />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-md border-2 border-gray-100">
                        <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No hay cursos</h3>
                        <p className="text-gray-600 mb-6">Comienza creando tu primer curso</p>
                        <Link
                            href="/dashboard/admin/courses/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <Plus size={20} />
                            Crear Curso
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100 hover:shadow-lg transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                            <BookOpen className="text-white" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{course.name}</h3>
                                            <p className="text-sm text-gray-600">{course.grade}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-4 text-gray-600">
                                    <Users size={18} />
                                    <span className="text-sm font-medium">
                                        {getEnrollmentCount(course)} estudiantes
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <Link
                                        href={`/dashboard/admin/courses/${course.id}`}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-semibold text-sm"
                                    >
                                        <Users size={16} />
                                        Ver Detalles
                                    </Link>
                                    <Link
                                        href={`/dashboard/admin/courses/${course.id}/edit`}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold text-sm"
                                    >
                                        <Pencil size={16} />
                                        Editar
                                    </Link>
                                    <button
                                        onClick={() => setDeleteConfirm(course.id)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-semibold text-sm"
                                    >
                                        <Trash2 size={16} />
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AdminBottomNav />
        </div>
    )
}
