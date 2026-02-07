'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, MapPin, Users, Calendar, Clock, FileText, CheckSquare } from 'lucide-react'

interface Course {
    id: string
    name: string
    level: string
}

interface Student {
    id: string
    full_name: string
}

interface CreateDECModalProps {
    isOpen: boolean
    onClose: () => void
    courses: Course[]
}

const INCIDENT_TYPES = [
    'Agresión verbal',
    'Agresión física',
    'Destrucción de inmueble',
    'Huida/Fuga',
    'Autolesión',
    'Oposicionismo',
    'Crisis de llanto',
    'Berrinche intenso',
    'Otros'
]

const TRIGGERING_SITUATIONS = [
    'Cambio de rutina',
    'Ruido excesivo',
    'Conflicto con pares',
    'Frustración académica',
    'Negación de solicitud',
    'Transición de actividad',
    'Sobrecarga sensorial',
    'Separación de figura de apego',
    'Desconocido',
    'Otros'
]

const ACTIONS_TAKEN = [
    'Contención verbal',
    'Retiro del espacio',
    'Contacto con apoderado',
    'Contención física',
    'Técnicas de respiración',
    'Tiempo de calma',
    'Redireccionamiento',
    'Acompañamiento emocional',
    'Derivación a dupla psicosocial',
    'Otros'
]

export default function CreateDECModal({ isOpen, onClose, courses }: CreateDECModalProps) {
    const [formData, setFormData] = useState({
        course_id: '',
        student_id: '',
        event_date: new Date().toISOString().split('T')[0],
        event_time: new Date().toTimeString().slice(0, 5),
        location: '',
        activity: '',
        context_description: '',
        intervening_people: [''],
        guardian_contacted: false,
        incident_types: [] as string[],
        intensity_level: 'etapa_2_moderada',
        triggering_situations: [] as string[],
        actions_taken: [] as string[],
        additional_observations: ''
    })

    const [students, setStudents] = useState<Student[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (formData.course_id) {
            fetchStudents(formData.course_id)
        } else {
            setStudents([])
            setFormData(prev => ({ ...prev, student_id: '' }))
        }
    }, [formData.course_id])

    const fetchStudents = async (courseId: string) => {
        setLoadingStudents(true)
        try {
            const response = await fetch(`/api/courses/${courseId}/students`)
            if (response.ok) {
                const data = await response.json()
                setStudents(data)
            }
        } catch (error) {
            console.error('Error fetching students:', error)
        } finally {
            setLoadingStudents(false)
        }
    }

    const toggleIncidentType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            incident_types: prev.incident_types.includes(type)
                ? prev.incident_types.filter(t => t !== type)
                : [...prev.incident_types, type]
        }))
    }

    const toggleAction = (action: string) => {
        setFormData(prev => ({
            ...prev,
            actions_taken: prev.actions_taken.includes(action)
                ? prev.actions_taken.filter(a => a !== action)
                : [...prev.actions_taken, action]
        }))
    }

    const toggleTriggeringSituation = (situation: string) => {
        setFormData(prev => ({
            ...prev,
            triggering_situations: prev.triggering_situations.includes(situation)
                ? prev.triggering_situations.filter(s => s !== situation)
                : [...prev.triggering_situations, situation]
        }))
    }

    const addInterveningPerson = () => {
        setFormData(prev => ({
            ...prev,
            intervening_people: [...prev.intervening_people, '']
        }))
    }

    const updateInterveningPerson = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            intervening_people: prev.intervening_people.map((p, i) => i === index ? value : p)
        }))
    }

    const removeInterveningPerson = (index: number) => {
        setFormData(prev => ({
            ...prev,
            intervening_people: prev.intervening_people.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Filter out empty intervening people
            const cleanedData = {
                ...formData,
                intervening_people: formData.intervening_people.filter(p => p.trim() !== '')
            }

            const response = await fetch('/api/professional/dec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedData)
            })

            if (response.ok) {
                onClose()
                window.location.reload()
            }
        } catch (error) {
            console.error('Error creating DEC record:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="text-red-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#475569]">Registro DEC</h2>
                            <p className="text-sm text-gray-500">Desregulación Emocional y Conductual</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Student Selection */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold text-lg text-[#475569] mb-4">Selección de Estudiante</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                    Curso
                                </label>
                                <select
                                    required
                                    value={formData.course_id}
                                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="">Seleccionar curso...</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} - {course.level}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                    Estudiante
                                </label>
                                <select
                                    required
                                    value={formData.student_id}
                                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                                    disabled={!formData.course_id || loadingStudents}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        {loadingStudents ? 'Cargando...' : 'Seleccionar estudiante...'}
                                    </option>
                                    {students.map(student => (
                                        <option key={student.id} value={student.id}>
                                            {student.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Event Context */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold text-lg text-[#475569] mb-4">Contexto del Evento</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <Calendar size={16} />
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.event_date}
                                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                    value={formData.event_time}
                                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <MapPin size={16} />
                                Lugar donde sucedió
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Ej: Sala de clases, Patio, Comedor"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Actividad en la que se encontraba
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.activity}
                                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                                placeholder="Ej: Clase de matemáticas, Recreo, Almuerzo"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Contexto - ¿Qué estaba haciendo el niño?
                            </label>
                            <textarea
                                required
                                value={formData.context_description}
                                onChange={(e) => setFormData({ ...formData, context_description: e.target.value })}
                                placeholder="Describe brevemente qué estaba haciendo el estudiante..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Intervention */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="flex items-center gap-2 font-semibold text-lg text-[#475569] mb-4">
                            <Users size={20} />
                            Intervención
                        </h3>

                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Personas que intervinieron
                            </label>
                            <div className="space-y-2">
                                {formData.intervening_people.map((person, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={person}
                                            onChange={(e) => updateInterveningPerson(index, e.target.value)}
                                            placeholder="Nombre y apellido"
                                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                        {formData.intervening_people.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeInterveningPerson(index)}
                                                className="px-4 py-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addInterveningPerson}
                                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    + Agregar otra persona
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={formData.guardian_contacted}
                                    onChange={(e) => setFormData({ ...formData, guardian_contacted: e.target.checked })}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                                />
                                <span className="font-semibold text-gray-700">¿Se contactó con el apoderado?</span>
                            </label>
                        </div>
                    </div>

                    {/* Incident Details */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold text-lg text-[#475569] mb-4">Detalles del Incidente</h3>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                                <CheckSquare size={16} />
                                Tipo de Incidente (seleccionar todos los que apliquen)
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {INCIDENT_TYPES.map(type => (
                                    <label
                                        key={type}
                                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.incident_types.includes(type)}
                                            onChange={() => toggleIncidentType(type)}
                                            className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                                <AlertTriangle size={16} />
                                Intensidad
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.intensity_level === 'etapa_2_moderada'
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="intensity"
                                        value="etapa_2_moderada"
                                        checked={formData.intensity_level === 'etapa_2_moderada'}
                                        onChange={(e) => setFormData({ ...formData, intensity_level: e.target.value })}
                                        className="mt-1 w-5 h-5 text-orange-600"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-900">Etapa 2 - Moderada</p>
                                        <p className="text-sm text-gray-600 mt-1">Conducta disruptiva que requiere intervención pero no presenta riesgo inmediato</p>
                                    </div>
                                </label>

                                <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.intensity_level === 'etapa_3_severa'
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="intensity"
                                        value="etapa_3_severa"
                                        checked={formData.intensity_level === 'etapa_3_severa'}
                                        onChange={(e) => setFormData({ ...formData, intensity_level: e.target.value })}
                                        className="mt-1 w-5 h-5 text-red-600"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-900">Etapa 3 - Severa</p>
                                        <p className="text-sm text-gray-600 mt-1">Riesgo para sí mismo o para otros, requiere intervención inmediata</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                                <CheckSquare size={16} />
                                Situación Desencadenante (seleccionar todas las que apliquen)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {TRIGGERING_SITUATIONS.map(situation => (
                                    <label
                                        key={situation}
                                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.triggering_situations.includes(situation)}
                                            onChange={() => toggleTriggeringSituation(situation)}
                                            className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{situation}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions Taken */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="flex items-center gap-2 font-semibold text-lg text-[#475569] mb-4">
                            <FileText size={20} />
                            Acciones Realizadas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ACTIONS_TAKEN.map(action => (
                                <label
                                    key={action}
                                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.actions_taken.includes(action)}
                                        onChange={() => toggleAction(action)}
                                        className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{action}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Additional Observations */}
                    <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="font-semibold text-lg text-[#475569] mb-4">Observaciones Adicionales</h3>
                        <textarea
                            value={formData.additional_observations}
                            onChange={(e) => setFormData({ ...formData, additional_observations: e.target.value })}
                            placeholder="Cualquier observación adicional que consideres pertinente..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-4 border-t border-gray-100">
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
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar Registro DEC'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
