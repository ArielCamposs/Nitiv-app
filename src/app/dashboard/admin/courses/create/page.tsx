'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Loader2, Users } from 'lucide-react'
import Link from 'next/link'
import { createCourse, getStudents } from '../actions'

interface Student {
    id: string
    full_name: string
}

export default function CreateCoursePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [students, setStudents] = useState<Student[]>([])
    const [formData, setFormData] = useState({
        name: '',
        student_ids: [] as string[]
    })

    useEffect(() => {
        loadStudents()
    }, [])

    const loadStudents = async () => {
        try {
            const result = await getStudents()
            if (result.students) {
                setStudents(result.students)
            }
        } catch (error) {
            console.error('Error loading students:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')

        // Use name as grade as well
        const result = await createCourse({
            ...formData,
            grade: formData.name
        })

        if (result.error) {
            setError(result.error)
            setSaving(false)
        } else {
            router.push('/dashboard/admin/courses')
        }
    }

    const toggleStudent = (studentId: string) => {
        setFormData(prev => ({
            ...prev,
            student_ids: prev.student_ids.includes(studentId)
                ? prev.student_ids.filter(id => id !== studentId)
                : [...prev.student_ids, studentId]
        }))
    }

    const selectAll = () => {
        setFormData(prev => ({
            ...prev,
            student_ids: students.map(s => s.id)
        }))
    }

    const deselectAll = () => {
        setFormData(prev => ({
            ...prev,
            student_ids: []
        }))
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Crear Curso</h1>
                    <p className="text-gray-600">Crea un nuevo curso e inscribe estudiantes</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Course Details */}
                    <div className="bg-white rounded-2xl p-8 shadow-md border-2 border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Detalles del Curso</h2>

                        <div className="space-y-6">
                            {/* Course Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nombre del Curso *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                                    placeholder="Ej: Primero Básico, Segundo Básico, Tercero Medio"
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    Ingresa el curso completo (ej: "Primero Básico A", "Segundo Medio B")
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Student Selection */}
                    <div className="bg-white rounded-2xl p-8 shadow-md border-2 border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Users className="text-blue-600" size={24} />
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Estudiantes</h2>
                                    <p className="text-sm text-gray-600">
                                        {formData.student_ids.length} de {students.length} seleccionados
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
                                >
                                    Seleccionar Todos
                                </button>
                                <button
                                    type="button"
                                    onClick={deselectAll}
                                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                                >
                                    Deseleccionar
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-blue-500" size={40} />
                            </div>
                        ) : students.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No hay estudiantes disponibles
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {students.map((student) => (
                                    <label
                                        key={student.id}
                                        className={`
                                            flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                                            ${formData.student_ids.includes(student.id)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.student_ids.includes(student.id)}
                                            onChange={() => toggleStudent(student.id)}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="font-medium text-gray-900">{student.full_name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Crear Curso
                                </>
                            )}
                        </button>
                        <Link
                            href="/dashboard/admin/courses"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                        >
                            <X size={20} />
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
