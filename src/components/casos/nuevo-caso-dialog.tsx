"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

type Student = any

interface NuevoCasoDialogProps {
    isOpen: boolean
    onClose: () => void
    students: Student[]
    userId: string
    institutionId: string
    userName: string
}

const REASON_CHIPS = [
    "Conducta disruptiva", "Desregulación emocional", "Conflicto con pares", "Aislamiento social",
    "Tristeza / llanto frecuente", "Agresividad", "Ausentismo reiterado", "Bajo rendimiento asociado",
    "Situación familiar compleja", "Autolesiones / ideación", "Acoso entre pares", "Otro"
]

const WHEN_CHIPS = [
    "En clases", "En recreo", "Al inicio de la jornada", "Al salir", "Siempre", "Otro"
]

const FREQ_CHIPS = [
    "Hoy por primera vez", "Esta semana", "Hace 2-4 semanas", "Más de un mes", "Todo el año"
]

const DERIVE_CHIPS = [
    { value: "dupla", label: "Dupla psicosocial" },
    { value: "convivencia", label: "Convivencia" },
    { value: "inspector", label: "Inspectoría" },
    { value: "utp", label: "UTP" },
    { value: "director", label: "Dirección" },
]

const OTHER_REASON_MAX = 500
const OTHER_WHEN_MAX = 500
const OBSERVATION_MAX = 1000

export function NuevoCasoDialog({ 
    isOpen, 
    onClose, 
    students, 
    userId, 
    institutionId,
    userName
}: NuevoCasoDialogProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const [studentId, setStudentId] = useState("")
    const [selectedCourse, setSelectedCourse] = useState("")
    const [selectedReasons, setSelectedReasons] = useState<string[]>([])
    const [otherReason, setOtherReason] = useState("")
    const [whenOccurs, setWhenOccurs] = useState<string>("")
    const [otherWhenOccurs, setOtherWhenOccurs] = useState("")
    const [frequency, setFrequency] = useState<string>("")
    const [urgency, setUrgency] = useState<string>("") // 'baja', 'media', 'alta'
    const [deriveTo, setDeriveTo] = useState<string[]>([])
    const [observation, setObservation] = useState("")

    const courseOptions = Array.from(
        new Set(
            students
                .map((s) => {
                    const courseName = s.courses?.name
                    const courseSection = s.courses?.section
                    return courseName ? `${courseName}${courseSection ? ` ${courseSection}` : ""}` : null
                })
                .filter(Boolean) as string[]
        )
    ).sort((a, b) => a.localeCompare(b, "es"))

    const filteredStudents = students.filter((s) => {
        if (!selectedCourse) return false
        const courseName = s.courses?.name
        const courseSection = s.courses?.section
        const studentCourse = courseName ? `${courseName}${courseSection ? ` ${courseSection}` : ""}` : ""
        return studentCourse === selectedCourse
    })

    const toggleArrayChip = (chip: string, current: string[], setter: (v: string[]) => void) => {
        if (current.includes(chip)) setter(current.filter(c => c !== chip))
        else setter([...current, chip])
    }

    const handleSubmit = async () => {
        const hasOtherReasonSelected = selectedReasons.includes("Otro")
        const hasValidOtherReason = otherReason.trim().length > 0
        const finalWhenOccurs = whenOccurs === "Otro" ? otherWhenOccurs.trim() : whenOccurs

        if (!studentId || selectedReasons.length === 0 || !whenOccurs || !frequency || !urgency) {
            toast.error("Por favor completa los campos principales.")
            return
        }
        if (hasOtherReasonSelected && !hasValidOtherReason) {
            toast.error("Especifica el motivo en 'Otro'.")
            return
        }
        if (whenOccurs === "Otro" && !finalWhenOccurs) {
            toast.error("Especifica cuándo ocurre en 'Otro'.")
            return
        }

        try {
            setLoading(true)

            let mappedState = 'estable'
            if (urgency === 'media') mappedState = 'observacion'
            if (urgency === 'alta') mappedState = 'urgente'

            const finalReasons = selectedReasons.map((reason) =>
                reason === "Otro" ? `Otro: ${otherReason.trim()}` : reason
            )

            const { error } = await supabase
                .from("student_cases")
                .insert({
                    institution_id: institutionId,
                    student_id: studentId,
                    created_by: userId,
                    reason: finalReasons.join(" • ") + (observation ? `\n\nObs: ${observation}` : ""),
                    when_occurs: finalWhenOccurs,
                    frequency: frequency,
                    derived_to: JSON.stringify(["dupla", "convivencia"]),
                    initial_state: mappedState,
                    status: 'pendiente', 
                    responsable_id: null
                })

            if (error) throw error

            toast.success("Derivación enviada correctamente")
            
            setStudentId("")
            setSelectedCourse("")
            setSelectedReasons([])
            setOtherReason("")
            setWhenOccurs("")
            setOtherWhenOccurs("")
            setFrequency("")
            setUrgency("")
            setDeriveTo([])
            setObservation("")
            onClose()
            
        } catch (e: any) {
            toast.error("Error al enviar la derivación")
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => (!loading && !o && onClose())}>
            <DialogContent className="sm:max-w-3xl bg-white p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-[28px]">
                
                <DialogHeader className="px-6 py-4 border-b border-slate-100 flex-shrink-0 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl">Ficha de derivación</DialogTitle>
                        <DialogDescription className="text-slate-500 mt-1">Completa los campos para alertar al equipo de convivencia.</DialogDescription>
                    </div>
                    <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        {userName}
                    </div>
                </DialogHeader>

                <div className="px-6 py-5 overflow-y-auto space-y-8 flex-1">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Curso <span className="text-rose-500">*</span></label>
                            <Select
                                value={selectedCourse}
                                onValueChange={(value) => {
                                    setSelectedCourse(value)
                                    setStudentId("")
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona un curso..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {courseOptions.map((course) => (
                                        <SelectItem key={course} value={course}>
                                            {course}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estudiante <span className="text-rose-500">*</span></label>
                            <Select value={studentId} onValueChange={setStudentId} disabled={!selectedCourse}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={selectedCourse ? "Selecciona estudiante..." : "Primero selecciona un curso..."} />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {filteredStudents.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name} {s.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Motivo */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Motivo de derivación — Selecciona los que aplican <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {REASON_CHIPS.map(chip => {
                                const active = selectedReasons.includes(chip)
                                return (
                                    <button
                                        type="button"
                                        key={chip}
                                        onClick={() => toggleArrayChip(chip, selectedReasons, setSelectedReasons)}
                                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                            active 
                                            ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                )
                            })}
                        </div>
                        {selectedReasons.includes("Otro") && (
                            <div className="space-y-1">
                                <Textarea
                                    placeholder="Escribe el motivo específico..."
                                    value={otherReason}
                                    maxLength={OTHER_REASON_MAX}
                                    onChange={(e) => setOtherReason(e.target.value)}
                                    className="min-h-[110px] resize-none break-words whitespace-pre-wrap"
                                />
                                <p className="text-right text-xs text-slate-400">{otherReason.length}/{OTHER_REASON_MAX}</p>
                            </div>
                        )}
                    </div>

                    {/* Cuando ocurre */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            ¿Cuándo ocurre principalmente? <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {WHEN_CHIPS.map(chip => {
                                const active = whenOccurs === chip
                                return (
                                    <button
                                        type="button"
                                        key={chip}
                                        onClick={() => setWhenOccurs(chip)}
                                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                            active 
                                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                )
                            })}
                        </div>
                        {whenOccurs === "Otro" && (
                            <div className="space-y-1">
                                <Textarea
                                    placeholder="Especifica cuándo ocurre..."
                                    value={otherWhenOccurs}
                                    maxLength={OTHER_WHEN_MAX}
                                    onChange={(e) => setOtherWhenOccurs(e.target.value)}
                                    className="min-h-[110px] resize-none break-words whitespace-pre-wrap"
                                />
                                <p className="text-right text-xs text-slate-400">{otherWhenOccurs.length}/{OTHER_WHEN_MAX}</p>
                            </div>
                        )}
                    </div>

                    {/* Frecuencia observada */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Frecuencia observada <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {FREQ_CHIPS.map(chip => {
                                const active = frequency === chip
                                return (
                                    <button
                                        type="button"
                                        key={chip}
                                        onClick={() => setFrequency(chip)}
                                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                            active 
                                            ? "bg-amber-50 border-amber-200 text-amber-700" 
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Nivel de Urgencia */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Nivel de urgencia <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                type="button"
                                onClick={() => setUrgency("baja")}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                    urgency === "baja"
                                    ? "bg-slate-50 border-slate-800 text-slate-900 shadow-sm"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <span className="font-semibold">Baja</span>
                                <span className="text-xs mt-1 opacity-80">Puede esperar días</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setUrgency("media")}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                    urgency === "media"
                                    ? "bg-amber-50 border-amber-500 text-amber-900 shadow-sm"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50"
                                }`}
                            >
                                <span className="font-semibold">Media</span>
                                <span className="text-xs mt-1 opacity-80">Esta semana</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setUrgency("alta")}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                    urgency === "alta"
                                    ? "bg-rose-50 border-rose-500 text-rose-900 shadow-sm"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-rose-200 hover:bg-rose-50/50"
                                }`}
                            >
                                <span className="font-semibold">Alta</span>
                                <span className="text-xs mt-1 opacity-80">Hoy si es posible</span>
                            </button>
                        </div>
                    </div>

                    {/* Observación Breve */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Observación breve (Opcional)
                        </label>
                        <Textarea 
                            placeholder="Algo que quieras agregar que no quede en las opciones anteriores..." 
                            value={observation}
                            maxLength={OBSERVATION_MAX}
                            onChange={(e) => setObservation(e.target.value)}
                            className="min-h-[120px] resize-none break-words whitespace-pre-wrap"
                        />
                        <p className="text-right text-xs text-slate-400">{observation.length}/{OBSERVATION_MAX}</p>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {loading ? "Enviando..." : "Enviar derivación"}
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}
