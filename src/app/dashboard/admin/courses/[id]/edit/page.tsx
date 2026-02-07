'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { updateCourse, getCourseById } from '../../actions'

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        grade: ''
    })

    useEffect(() => {
        loadCourse()
    }, [])

    const loadCourse = async () => {
        try {
            const result = await getCourseById(resolvedParams.id)
            if (result.course) {
                setFormData({
                    name: result.course.name || '',
                    grade: result.course.grade || ''
                })
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')

        // Use name as grade as well
        const result = await updateCourse(resolvedParams.id, {
            name: formData.name,
            grade: formData.name
        })

        if (result.error) {
            setError(result.error)
            setSaving(false)
        } else {
            router.push('/dashboard/admin/courses')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <div className="max-w-3xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Editar Curso</h1>
                    <p className="text-gray-600">Modifica la información del curso</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-md border-2 border-gray-100">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-600">
                            {error}
                        </div>
                    )}

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

                    {/* Actions */}
                    <div className="mt-8 flex gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Guardar Cambios
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
