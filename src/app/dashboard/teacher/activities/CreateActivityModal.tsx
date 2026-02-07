'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createActivity } from './actions'

interface CreateActivityModalProps {
    courses: Array<{
        id: string
        name: string
        grade?: string
    }>
}

export default function CreateActivityModal({ courses }: CreateActivityModalProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-28 md:bottom-8 right-6 w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40"
                aria-label="Crear actividad"
            >
                <Plus size={24} />
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setIsOpen(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-[#475569] flex items-center gap-2">
                                <Plus size={20} />
                                Nueva Actividad
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form action={async (formData) => {
                            await createActivity(formData)
                            setIsOpen(false)
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                                <select
                                    name="courseId"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Seleccionar curso...</option>
                                    {courses.map((course) => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} {course.grade && `- ${course.grade}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Nombre de la actividad"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        name="activityType"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="assignment">Tarea</option>
                                        <option value="exam">Examen</option>
                                        <option value="event">Evento</option>
                                        <option value="project">Proyecto</option>
                                        <option value="other">Otro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        name="activityDate"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Detalles adicionales..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all"
                                >
                                    Crear
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
