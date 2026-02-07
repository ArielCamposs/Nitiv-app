'use client'

import { useState, useEffect } from 'react'
import { X, FileText, Calendar, Clock, User, AlertTriangle, Shield, CheckSquare } from 'lucide-react'

interface Course {
    id: string
    name: string
    level: string
}

interface Student {
    id: string
    full_name: string
}

interface CreateRecordModalProps {
    isOpen: boolean
    onClose: () => void
    courses: Course[]
}

const RECORD_TYPES = [
    { value: 'convivencia_escolar', label: 'Convivencia Escolar' },
    { value: 'acompañamiento_socioemocional', label: 'Acompañamiento Socioemocional' },
    { value: 'incidente', label: 'Incidente' },
    { value: 'entrevista', label: 'Entrevista con Apoderado/Estudiante' },
    { value: 'derivacion', label: 'Derivación' }
]

const SEVERITY_LEVELS = [
    { value: 'baja', label: 'Baja', color: 'bg-green-100 text-green-700' },
    { value: 'media', label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
    { value: 'critica', label: 'Crítica', color: 'bg-red-100 text-red-700' }
]

const ACTIONS = [
    'Entrevista con estudiante',
    'Entrevista con apoderado',
    'Derivación a dupla psicosocial',
    'Mediación escolar',
    'Seguimiento individual',
    'Trabajo en grupo',
    'Contacto con docentes',
    'Plan de intervención',
    'Reunión de caso',
    'Otros'
]

const CONFIDENTIALITY_LEVELS = [
    { value: 'publico', label: 'Público', description: 'Visible para docentes, dupla y admins' },
    { value: 'restringido', label: 'Restringido', description: 'Solo dupla y admins' },
    { value: 'confidencial', label: 'Confidencial', description: 'Solo admins' }
]

export default function CreateRecordModal({ isOpen, onClose, courses }: CreateRecordModalProps) {
    const [formData, setFormData] = useState({
        record_type: '',
        record_date: new Date().toISOString().split('T')[0],
        record_time: new Date().toTimeString().slice(0, 5),
        course_id: '',
        student_id: '',
        severity: 'baja',
        title: '',
        description: '',
        actions: [] as string[],
        confidentiality: 'publico'
    })

    const [students, setStudents] = useState<Student[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch students when course is selected
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

    const toggleAction = (action: string) => {
        setFormData(prev => ({
            ...prev,
            actions: prev.actions.includes(action)
                ? prev.actions.filter(a => a !== action)
                : [...prev.actions, action]
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/professional/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                onClose()
                window.location.reload()
            }
        } catch (error) {
            console.error('Error creating record:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FileText className="text-blue-600" size={20} />
                        </div>
                        <h2 className="text-2xl font-bold text-[#475569]">Nuevo Registro</h2>
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
                    {/* Type & DateTime Section */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold text-lg text-[#475569] mb-4">Información Básica</h3>

                        {/* Record Type */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <FileText size={16} />
                                Tipo de Registro
                            </label>
                            <select
                                required
                                value={formData.record_type}
                                onChange={(e) => setFormData({ ...formData, record_type: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar tipo...</option>
                                {RECORD_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
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
                                    value={formData.record_date}
                                    onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    value={formData.record_time}
                                    onChange={(e) => setFormData({ ...formData, record_time: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Student Selection Section */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold text-lg text-[#475569] mb-4">Selección de Estudiante</h3>

                        {/* Course Selection */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Curso
                            </label>
                            <select
                                required
                                value={formData.course_id}
                                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar curso...</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.name} - {course.level}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                                disabled={!formData.course_id || loadingStudents}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {loadingStudents ? 'Cargando estudiantes...' : 'Seleccionar estudiante...'}
                                </option>
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Case Description Section */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold text-lg text-[#475569] mb-4">Descripción del Caso</h3>

                        {/* Severity */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <AlertTriangle size={16} />
                                Gravedad
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {SEVERITY_LEVELS.map(level => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, severity: level.value })}
                                        className={`px-4 py-3 rounded-xl font-semibold transition-all ${formData.severity === level.value
                                                ? level.color + ' ring-2 ring-offset-2 ring-blue-500'
                                                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        {level.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Título
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ej: Conflicto en recreo"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Descripción Detallada
                            </label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe detalladamente lo ocurrido..."
                                rows={5}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Actions Section */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="flex items-center gap-2 font-semibold text-lg text-[#475569] mb-4">
                            <CheckSquare size={20} />
                            Acciones Realizadas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ACTIONS.map(action => (
                                <label
                                    key={action}
                                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.actions.includes(action)}
                                        onChange={() => toggleAction(action)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{action}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Confidentiality Section */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h3 className="flex items-center gap-2 font-semibold text-lg text-[#475569] mb-4">
                            <Shield size={20} />
                            Nivel de Confidencialidad
                        </h3>
                        <div className="space-y-3">
                            {CONFIDENTIALITY_LEVELS.map(level => (
                                <label
                                    key={level.value}
                                    className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.confidentiality === level.value
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="confidentiality"
                                        value={level.value}
                                        checked={formData.confidentiality === level.value}
                                        onChange={(e) => setFormData({ ...formData, confidentiality: e.target.value })}
                                        className="mt-1 w-5 h-5 text-blue-600"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-900">{level.label}</p>
                                        <p className="text-sm text-gray-500 mt-1">{level.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
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
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creando...' : 'Crear Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
