'use client'

import { useState } from 'react'
import { X, User, FileText } from 'lucide-react'

interface CreateCaseModalProps {
    isOpen: boolean
    onClose: () => void
    students: Array<{ id: string; full_name: string }>
}

export default function CreateCaseModal({ isOpen, onClose, students }: CreateCaseModalProps) {
    const [formData, setFormData] = useState({
        student_id: '',
        title: '',
        summary: '',
        status: 'active'
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/professional/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                onClose()
                window.location.reload()
            }
        } catch (error) {
            console.error('Error creating case:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FileText className="text-blue-600" size={20} />
                        </div>
                        <h2 className="text-2xl font-bold text-[#475569]">Nuevo Caso Clínico</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Student Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <User size={16} />
                            Estudiante
                        </label>
                        <select
                            required
                            value={formData.student_id}
                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Seleccionar estudiante...</option>
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Título del Caso
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ej: Apoyo en adaptación escolar"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Summary */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Resumen Inicial
                        </label>
                        <textarea
                            required
                            value={formData.summary}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                            placeholder="Describe brevemente la situación del estudiante..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Estado
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="active">Activo</option>
                            <option value="closed">Cerrado</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creando...' : 'Crear Caso'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
