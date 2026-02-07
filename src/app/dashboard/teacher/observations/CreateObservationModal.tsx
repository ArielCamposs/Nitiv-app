'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createObservation } from './actions'

interface CreateObservationModalProps {
    students: Array<{
        id: string
        full_name: string
        courseName: string
    }>
    studentFilter?: string
}

export default function CreateObservationModal({ students, studentFilter }: CreateObservationModalProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-28 md:bottom-8 right-6 w-14 h-14 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40"
                aria-label="Crear observación"
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
                                Nueva Observación
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form action={async (formData) => {
                            await createObservation(formData)
                            setIsOpen(false)
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estudiante</label>
                                <select
                                    name="studentId"
                                    required
                                    defaultValue={studentFilter || ''}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Seleccionar estudiante...</option>
                                    {students.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.full_name} - {student.courseName}
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
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Título de la observación"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                <select
                                    name="category"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="academic">Académica</option>
                                    <option value="behavioral">Conductual</option>
                                    <option value="social">Social</option>
                                    <option value="other">Otra</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
                                <textarea
                                    name="content"
                                    required
                                    rows={4}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Describe la observación..."
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
                                    className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
