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
    staff: Array<{
        id: string
        full_name: string
        role: string
    }>
}

export default function CreateActivityModal({ courses, staff }: CreateActivityModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedCourses, setSelectedCourses] = useState<string[]>([])
    const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>([])

    const toggleCourse = (courseId: string) => {
        setSelectedCourses(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        )
    }

    const toggleResponsible = (staffId: string) => {
        setSelectedResponsibles(prev =>
            prev.includes(staffId)
                ? prev.filter(id => id !== staffId)
                : [...prev, staffId]
        )
    }

    const handleSubmit = async (formData: FormData) => {
        // Add selected courses and responsibles to formData
        formData.append('courses', JSON.stringify(selectedCourses))
        formData.append('responsibles', JSON.stringify(selectedResponsibles))

        await createActivity(formData)
        setIsOpen(false)
        setSelectedCourses([])
        setSelectedResponsibles([])
    }

    return (
        <>
            {/* Visible Button - Not floating */}
            <button
                onClick={() => setIsOpen(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 font-bold"
            >
                <Plus size={20} />
                Nueva Actividad
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setIsOpen(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

                        <form action={handleSubmit} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Nombre de la actividad"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                                <textarea
                                    name="description"
                                    required
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Descripción detallada de la actividad..."
                                />
                            </div>

                            {/* Activity Type and Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Actividad *</label>
                                    <select
                                        name="activityType"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="colegio">Actividad del Colegio</option>
                                        <option value="salida_pedagogica">Salida Pedagógica</option>
                                        <option value="entidad_externa">Entidad Externa</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                                    <select
                                        name="status"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="planificado">Planificado</option>
                                        <option value="en_curso">En Curso</option>
                                        <option value="realizada">Realizada</option>
                                    </select>
                                </div>
                            </div>

                            {/* Start and End Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio *</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Término</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Responsibles - Multi-select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Responsables *</label>
                                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                                    {staff.map((person) => (
                                        <label key={person.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={selectedResponsibles.includes(person.id)}
                                                onChange={() => toggleResponsible(person.id)}
                                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {person.full_name} <span className="text-gray-400">({person.role === 'teacher' ? 'Profesor' : 'Psicólogo'})</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{selectedResponsibles.length} seleccionado(s)</p>
                            </div>

                            {/* Courses - Multi-select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cursos Participantes *</label>
                                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                                    {courses.map((course) => (
                                        <label key={course.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={selectedCourses.includes(course.id)}
                                                onChange={() => toggleCourse(course.id)}
                                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {course.name} {course.grade && `- ${course.grade}`}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{selectedCourses.length} seleccionado(s)</p>
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
                                    disabled={selectedCourses.length === 0 || selectedResponsibles.length === 0}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Crear Actividad
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
