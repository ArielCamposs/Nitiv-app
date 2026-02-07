'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createUser } from '../actions'

export default function CreateUserPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'student',
        course_id: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const result = await createUser(formData)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            router.push('/dashboard/admin/users')
        }
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <div className="max-w-3xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard/admin/users"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
                    >
                        <ArrowLeft size={20} />
                        Volver a usuarios
                    </Link>
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Crear Nuevo Usuario</h1>
                    <p className="text-gray-600">Completa el formulario para crear un nuevo usuario</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-md border-2 border-gray-100">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
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
                                placeholder="Juan Pérez"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email *
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                                placeholder="usuario@ejemplo.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Contraseña *
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                                placeholder="Mínimo 6 caracteres"
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
                                <p className="mt-2 text-sm text-gray-500">
                                    Si proporcionas un ID de curso, el estudiante será inscrito automáticamente
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Crear Usuario
                                </>
                            )}
                        </button>
                        <Link
                            href="/dashboard/admin/users"
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
