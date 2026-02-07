'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { updateUser, getAllUsers } from '../../actions'

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        full_name: '',
        role: 'student',
        course_id: ''
    })

    useEffect(() => {
        loadUser()
    }, [])

    const loadUser = async () => {
        try {
            const usersData = await getAllUsers()
            const user = usersData?.users?.find(u => u.id === resolvedParams.id)

            if (user) {
                setFormData({
                    full_name: user.full_name || '',
                    role: user.role || 'student',
                    course_id: ''
                })
            }
        } catch (error) {
            console.error('Error loading user:', error)
            setError('Error al cargar usuario')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')

        const result = await updateUser(resolvedParams.id, formData)

        if (result.error) {
            setError(result.error)
            setSaving(false)
        } else {
            router.push('/dashboard/admin/users')
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
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Editar Usuario</h1>
                    <p className="text-gray-600">Modifica la información del usuario</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-md border-2 border-gray-100">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Nombre Completo *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Rol *
                            </label>
                            <select
                                required
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                            >
                                <option value="student">Estudiante</option>
                                <option value="teacher">Profesor</option>
                                <option value="professional">Psicólogo</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>

                        {/* Course ID (only for students) */}
                        {formData.role === 'student' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    ID del Curso (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.course_id}
                                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                                    placeholder="UUID del curso"
                                />
                            </div>
                        )}
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
                            href="/dashboard/admin/users"
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
