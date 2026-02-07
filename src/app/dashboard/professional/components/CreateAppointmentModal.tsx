'use client'

import { useState } from 'react'
import { X, Calendar, Clock, User } from 'lucide-react'

interface CreateAppointmentModalProps {
    isOpen: boolean
    onClose: () => void
    students: Array<{ id: string; full_name: string }>
}

export default function CreateAppointmentModal({ isOpen, onClose, students }: CreateAppointmentModalProps) {
    const [formData, setFormData] = useState({
        student_id: '',
        title: '',
        description: '',
        appointment_date: '',
        appointment_time: '',
        duration_minutes: 60
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Combine date and time
            const dateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`)

            const response = await fetch('/api/professional/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    appointment_date: dateTime.toISOString()
                })
            })

            if (response.ok) {
                onClose()
                window.location.reload()
            }
        } catch (error) {
            console.error('Error creating appointment:', error)
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
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <Calendar className="text-green-600" size={20} />
                        </div>
                        <h2 className="text-2xl font-bold text-[#475569]">Nueva Sesión</h2>
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
                            value={formData.student_id}
                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="">Sin asignar (reunión general)</option>
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
                            Título de la Sesión
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ej: Sesión de seguimiento"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Descripción (Opcional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Objetivos de la sesión..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Calendar size={16} />
                                Fecha
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.appointment_date}
                                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Clock size={16} />
                                Hora
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.appointment_time}
                                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Duración
                        </label>
                        <select
                            value={formData.duration_minutes}
                            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value={30}>30 minutos</option>
                            <option value={45}>45 minutos</option>
                            <option value={60}>60 minutos</option>
                            <option value={90}>90 minutos</option>
                            <option value={120}>120 minutos</option>
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
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creando...' : 'Agendar Sesión'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
