"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Mic, MicOff, Plus, X } from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Datos del formulario (orden y opciones según protocolo DEC)
const LOCATIONS = ["Sala de clases", "Patio", "Comedor", "Baño", "Pasillo", "Entrada", "Otro"]
const ACTIVITY_TYPES = ["Conocida", "Desconocida", "Programada", "Improvisada"]
const ENVIRONMENT_TYPES = ["Tranquilo", "Ruidoso"]
const GUARDIAN_INFO_OPTIONS = ["Llamada", "WhatsApp", "Correo", "Otro"]
const CONDUCT_TYPES = [
    "Autoagresión",
    "Agresión a otros/as estudiantes",
    "Agresión hacia docentes",
    "Agresión hacia asistentes de la educación",
    "Destrucción de objetos/ropa",
    "Gritos/agresión verbal",
    "Fuga",
    "Otro",
]
const TRIGGERS = [
    "Cambio de rutina",
    "Ruido excesivo",
    "Demanda académica",
    "Conflicto con pares",
    "Transición de actividad",
    "Frustración",
    "Sobrecarga sensorial",
    "Ansiedad anticipada",
    "Factor no identificado",
    "Otro",
]
const ACTIONS = [
    "Contención verbal",
    "Acompañamiento emocional",
    "Retiro del espacio",
    "Espacio de calma",
    "Contacto con apoderado",
    "Derivación a Dupla Psicosocial",
    "Primeros auxilios",
    "Llamada a emergencias",
    "Otro",
]

// ... imports

// ... constants

function calcAge(birthdate: string | null | undefined): number | null {
    if (!birthdate) return null
    const birth = new Date(birthdate)
    if (isNaN(birth.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
}

type StudentOption = {
    id: string
    name: string
    last_name: string
    birthdate?: string | null
    guardian_name?: string | null
    guardian_phone?: string | null
    course_id?: string | null
    courses?: { id: string; name: string; section?: string } | null
}
type ProfessionalOption = { id: string; name: string; last_name: string; role: string }
type Props = {
    students: StudentOption[]
    headTeacherByCourse?: Record<string, string>
    professionals: ProfessionalOption[]
    teacherId: string
    institutionId: string
}

const TOTAL_STEPS = 6

export function DecForm({ students, headTeacherByCourse = {}, professionals = [], teacherId, institutionId }: Props) {
    const router = useRouter()
    const supabase = createClient()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // 1. Contexto inmediato
    const [incidentDate, setIncidentDate] = useState(() => {
        const now = new Date()
        // Ajustar a hora local para datetime-local (evita desfase UTC)
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        return local.toISOString().slice(0, 16)
    })
    const [incidentEndDate, setIncidentEndDate] = useState("")
    const [location, setLocation] = useState("")
    const [locationOther, setLocationOther] = useState("")
    const [activityTypes, setActivityTypes] = useState<string[]>([])
    const [environment, setEnvironment] = useState("")
    const [approxPeople, setApproxPeople] = useState("")

    // 2. Identificación estudiante + 3. Profesionales
    const [studentId, setStudentId] = useState("")
    const [professionalEncargadoId, setProfessionalEncargadoId] = useState("")
    const [professionalAcompananteIntId, setProfessionalAcompananteIntId] = useState("")
    const [professionalAcompananteExtId, setProfessionalAcompananteExtId] = useState("")
    const [additionalProfessionalIds, setAdditionalProfessionalIds] = useState<string[]>([])

    // 4. Apoderado (auto desde estudiante)
    const [guardianContacted, setGuardianContacted] = useState(false)
    const [guardianInfoMethod, setGuardianInfoMethod] = useState("")
    const [guardianInfoOther, setGuardianInfoOther] = useState("")

    // 5. Tipo incidente + 6. Nivel intensidad
    const [conductTypes, setConductTypes] = useState<string[]>([])
    const [conductOther, setConductOther] = useState("")
    const [severity, setSeverity] = useState<"moderada" | "severa" | "">("")

    // 7. Situaciones desencadenantes
    const [triggers, setTriggers] = useState<string[]>([])
    const [triggerOther, setTriggerOther] = useState("")

    // 8-9. Acciones y observaciones
    const [actions, setActions] = useState<string[]>([])
    const [actionOther, setActionOther] = useState("")
    const [description, setDescription] = useState("")
    const [isListening, setIsListening] = useState(false)
    const recognitionRef = useRef<any>(null)

    const selectedStudent = students.find((s) => s.id === studentId) ?? null
    const age = selectedStudent ? calcAge(selectedStudent.birthdate) : null
    const courseLabel = selectedStudent?.courses
        ? `${selectedStudent.courses.name}${selectedStudent.courses.section ? " " + selectedStudent.courses.section : ""}`
        : "—"
    const headTeacherName = (selectedStudent?.course_id && headTeacherByCourse[selectedStudent.course_id]) ?? "—"

    // (El usuario elige libremente a quién notificar sin pre-marcar por severidad)

    const toggleItem = (
        list: string[],
        setList: (v: string[]) => void,
        item: string
    ) => {
        setList(
            list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
        )
    }

    const toggleDictation = () => {
        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            setIsListening(false)
            return
        }

        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            toast.error("Tu navegador no soporta dictado por voz.")
            return
        }

        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRec()

        recognition.lang = "es-CL"
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        recognition.continuous = true

        recognition.onstart = () => {
            setIsListening(true)
        }

        recognition.onresult = (event: any) => {
            let finalTranscript = ""
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + " "
                }
            }
            if (finalTranscript) {
                setDescription(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + finalTranscript)
            }
        }

        recognition.onerror = (event: any) => {
            if (event.error === 'aborted' || event.error === 'no-speech') {
                setIsListening(false)
                return
            }

            console.error("Speech recognition error:", event.error, event)
            if (event.error === 'not-allowed') {
                toast.error("Permiso de micrófono denegado. Revisa la configuración de tu navegador.")
            } else {
                toast.error(`Error en dictado: ${event.error || "Desconocido"}`)
            }
            setIsListening(false)
        }

        recognition.onend = () => {
            setIsListening(false)
        }

        recognitionRef.current = recognition
        recognition.start()
    }

    const handleSubmit = async () => {
        if (!studentId || !severity || !location) {
            toast.error("Completa los campos obligatorios: Estudiante, Lugar y Severidad.")
            return
        }

        try {
            setLoading(true)

            // 1) Crear el incidente
            const contextParts: string[] = []
            if (activityTypes.length) contextParts.push(`Actividad: ${activityTypes.join(", ")}`)
            if (environment) contextParts.push(`Ambiente: ${environment}`)
            if (approxPeople.trim()) contextParts.push(`N° de personas: ${approxPeople.trim()}`)
            const encargado = professionalEncargadoId ? professionals.find((p) => p.id === professionalEncargadoId) : null
            const acompInt = professionalAcompananteIntId ? professionals.find((p) => p.id === professionalAcompananteIntId) : null
            const acompExt = professionalAcompananteExtId ? professionals.find((p) => p.id === professionalAcompananteExtId) : null
            const additionalProfs = additionalProfessionalIds
                .map((id) => id ? professionals.find((p) => p.id === id) : null)
                .filter(Boolean) as { name: string; last_name: string }[]
            if (encargado || acompInt || acompExt || additionalProfs.length > 0) {
                const profs = [
                    encargado && `Encargado: ${encargado.name} ${encargado.last_name}`.trim(),
                    acompInt && `Acompañante interno: ${acompInt.name} ${acompInt.last_name}`.trim(),
                    acompExt && `Acompañante externo: ${acompExt.name} ${acompExt.last_name}`.trim(),
                    ...additionalProfs.map((ap) => `Otro profesional: ${ap.name} ${ap.last_name}`),
                ].filter(Boolean)
                if (profs.length) contextParts.push(profs.join(" | "))
            }
            if (guardianInfoMethod) {
                const infoText = guardianInfoMethod === "Otro" && guardianInfoOther.trim() ? `Otro: ${guardianInfoOther.trim()}` : guardianInfoMethod
                contextParts.push(`Forma en que se informó a apoderado: ${infoText}`)
            }
            const contextString = contextParts.join(". ") || null

            const { data: incident, error } = await supabase
                .from("incidents")
                .insert({
                    institution_id: institutionId,
                    student_id: studentId,
                    reporter_id: teacherId,
                    type: "DEC",
                    severity,
                    location: location === "Otro" && locationOther.trim() ? `Otro: ${locationOther.trim()}` : location,
                    context: contextString,
                    conduct_types: conductOther.trim() ? [...conductTypes.filter((c) => c !== "Otro"), `Otro: ${conductOther.trim()}`] : conductTypes,
                    triggers: triggerOther.trim() ? [...triggers.filter((t) => t !== "Otro"), `Otro: ${triggerOther.trim()}`] : triggers,
                    actions_taken: actionOther.trim() ? [...actions.filter((a) => a !== "Otro"), `Otro: ${actionOther.trim()}`] : actions,
                    description: description.trim() || null,
                    guardian_contacted: guardianContacted,
                    incident_date: new Date(incidentDate).toISOString(),
                    end_date: incidentEndDate ? new Date(incidentEndDate).toISOString() : null,
                    resolved: false,
                })
                .select("id")
                .single()

            if (error || !incident) {
                console.error(error)
                toast.error("No se pudo guardar el caso DEC.")
                return
            }

            toast.success("Caso DEC reportado.")
            router.push("/dec")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 pb-10">

            {/* Indicador de pasos */}
            <div className="flex gap-2">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                    <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-indigo-500" : "bg-slate-200"}`}
                    />
                ))}
            </div>

            {/* SECCIÓN 1: Contexto inmediato */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>1. Contexto inmediato</CardTitle>
                        <CardDescription>
                            Fecha, duración, dónde estaba el/la estudiante y características del ambiente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">Fecha y hora de inicio <span className="text-red-500">*</span></label>
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                    value={incidentDate}
                                    onChange={(e) => setIncidentDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">Hora de fin <span className="text-slate-400 font-normal">(opcional)</span></label>
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                    value={incidentEndDate}
                                    onChange={(e) => setIncidentEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">Dónde estaba el/la estudiante cuando se produce la DEC <span className="text-red-500">*</span></label>
                            <Select onValueChange={(v) => { setLocation(v); if (v !== "Otro") setLocationOther("") }} value={location}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona el lugar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LOCATIONS.map((l) => (
                                        <SelectItem key={l} value={l}>{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {location === "Otro" && (
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm mt-1"
                                    placeholder="Especifique el lugar..."
                                    value={locationOther}
                                    onChange={(e) => setLocationOther(e.target.value)}
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">La actividad que estaba realizando el/la estudiante fue:</label>
                            <div className="flex flex-wrap gap-2">
                                {ACTIVITY_TYPES.map((a) => (
                                    <button
                                        key={a}
                                        type="button"
                                        onClick={() => toggleItem(activityTypes, setActivityTypes, a)}
                                        className={`rounded-full border px-3 py-1 text-xs transition-all ${activityTypes.includes(a) ? "border-indigo-500 bg-indigo-100 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">El ambiente era:</label>
                            <div className="flex flex-wrap gap-2">
                                {ENVIRONMENT_TYPES.map((e) => (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => setEnvironment((prev) => (prev === e ? "" : e))}
                                        className={`rounded-full border px-3 py-1 text-xs transition-all ${environment === e ? "border-indigo-500 bg-indigo-100 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">N° de personas en el lugar</label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                placeholder="Ej: 25"
                                value={approxPeople}
                                onChange={(e) => setApproxPeople(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN 2 y 3: Identificación estudiante + Profesionales intervención */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>2. Identificación del niño/a, adolescente o joven</CardTitle>
                        <CardDescription>
                            Selecciona al estudiante; se completarán automáticamente edad, curso y profesor jefe.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">Nombre <span className="text-red-500">*</span></label>
                            <Select onValueChange={setStudentId} value={studentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Buscar estudiante..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.last_name}, {s.name}{s.courses ? ` — ${s.courses.name}${s.courses.section ? " " + s.courses.section : ""}` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedStudent && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                                <div>
                                    <p className="text-[10px] uppercase text-slate-500">Edad</p>
                                    <p className="text-sm font-medium text-slate-800">{age != null ? `${age} años` : "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-500">Curso</p>
                                    <p className="text-sm font-medium text-slate-800">{courseLabel}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] uppercase text-slate-500">Prof. jefe</p>
                                    <p className="text-sm font-medium text-slate-800">{headTeacherName}</p>
                                </div>
                            </div>
                        )}
                        <div className="pt-2 border-t border-slate-100">
                            <p className="text-sm font-medium text-slate-900 mb-2">3. Profesionales del establecimiento designados para intervención</p>
                            <p className="text-xs text-slate-500 mb-2">Cada profesional solo puede ser seleccionado en un rol. Los ya elegidos se bloquean en los demás.</p>
                            <div className="space-y-2">
                                {(() => {
                                    const othersForEncargado = [professionalAcompananteIntId, professionalAcompananteExtId, ...additionalProfessionalIds].filter(Boolean)
                                    const othersForAcompInt = [professionalEncargadoId, professionalAcompananteExtId, ...additionalProfessionalIds].filter(Boolean)
                                    const othersForAcompExt = [professionalEncargadoId, professionalAcompananteIntId, ...additionalProfessionalIds].filter(Boolean)
                                    return (
                                        <>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                <span className="text-xs text-slate-500 w-36 shrink-0">Encargado</span>
                                                <Select value={professionalEncargadoId || "_none"} onValueChange={(v) => setProfessionalEncargadoId(v === "_none" ? "" : v)}>
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Seleccionar profesional..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="_none">Ninguno</SelectItem>
                                                        {professionals.map((p) => (
                                                            <SelectItem key={p.id} value={p.id} disabled={othersForEncargado.includes(p.id)}>
                                                                {p.last_name}, {p.name} {p.role ? `— ${p.role}` : ""}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                <span className="text-xs text-slate-500 w-36 shrink-0">Acompañante interno</span>
                                                <Select value={professionalAcompananteIntId || "_none"} onValueChange={(v) => setProfessionalAcompananteIntId(v === "_none" ? "" : v)}>
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Seleccionar profesional..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="_none">Ninguno</SelectItem>
                                                        {professionals.map((p) => (
                                                            <SelectItem key={p.id} value={p.id} disabled={othersForAcompInt.includes(p.id)}>
                                                                {p.last_name}, {p.name} {p.role ? `— ${p.role}` : ""}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                <span className="text-xs text-slate-500 w-36 shrink-0">Acompañante externo</span>
                                                <Select value={professionalAcompananteExtId || "_none"} onValueChange={(v) => setProfessionalAcompananteExtId(v === "_none" ? "" : v)}>
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Seleccionar profesional..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="_none">Ninguno</SelectItem>
                                                        {professionals.map((p) => (
                                                            <SelectItem key={p.id} value={p.id} disabled={othersForAcompExt.includes(p.id)}>
                                                                {p.last_name}, {p.name} {p.role ? `— ${p.role}` : ""}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {additionalProfessionalIds.map((id, idx) => {
                                                const othersForThis = [
                                                    professionalEncargadoId,
                                                    professionalAcompananteIntId,
                                                    professionalAcompananteExtId,
                                                    ...additionalProfessionalIds.filter((_, i) => i !== idx),
                                                ].filter(Boolean)
                                                return (
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                        <span className="text-xs text-slate-500 w-36 shrink-0">Otro profesional</span>
                                                        <Select
                                                            value={id || "_none"}
                                                            onValueChange={(v) => {
                                                                const val = v === "_none" ? "" : v
                                                                setAdditionalProfessionalIds((prev) => {
                                                                    const next = [...prev]
                                                                    next[idx] = val
                                                                    return next
                                                                })
                                                            }}
                                                        >
                                                            <SelectTrigger className="flex-1">
                                                                <SelectValue placeholder="Seleccionar profesional..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="_none">Ninguno</SelectItem>
                                                                {professionals.map((p) => (
                                                                    <SelectItem key={p.id} value={p.id} disabled={othersForThis.includes(p.id)}>
                                                                        {p.last_name}, {p.name} {p.role ? `— ${p.role}` : ""}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="shrink-0 h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => setAdditionalProfessionalIds((prev) => prev.filter((_, i) => i !== idx))}
                                                            aria-label="Quitar profesional"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )
                                            })}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 mt-1"
                                                onClick={() => setAdditionalProfessionalIds((prev) => [...prev, ""])}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Agregar otro profesional
                                            </Button>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN 4: Apoderado (auto desde perfil estudiante) */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>4. Identificación apoderado y forma de contacto</CardTitle>
                        <CardDescription>
                            Datos del apoderado del estudiante seleccionado (desde su perfil).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedStudent ? (
                            <>
                                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-500">Nombre</p>
                                        <p className="text-sm font-medium text-slate-800">{selectedStudent.guardian_name || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-500">Celular</p>
                                        <p className="text-sm font-medium text-slate-800">{selectedStudent.guardian_phone || "—"}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900">Forma en que se informó oportunamente a apoderados (opcional)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {GUARDIAN_INFO_OPTIONS.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => { setGuardianInfoMethod((prev) => (prev === opt ? "" : opt)); if (opt !== "Otro") setGuardianInfoOther("") }}
                                                className={`rounded-full border px-3 py-1.5 text-xs transition-all ${guardianInfoMethod === opt ? "border-indigo-500 bg-indigo-100 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                    {guardianInfoMethod === "Otro" && (
                                        <input
                                            type="text"
                                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm mt-2"
                                            placeholder="Especifique..."
                                            value={guardianInfoOther}
                                            onChange={(e) => setGuardianInfoOther(e.target.value)}
                                        />
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="guardian" checked={guardianContacted} onChange={(e) => setGuardianContacted(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                    <label htmlFor="guardian" className="text-sm text-slate-700">Apoderado contactado</label>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">Selecciona primero un estudiante en el paso 2.</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN 5 y 6: Tipo incidente + Nivel intensidad */}
            {step === 4 && (
                <Card>
                    <CardHeader>
                        <CardTitle>5. Tipo de incidente y 6. Nivel de intensidad</CardTitle>
                        <CardDescription>
                            Marque con X lo que corresponda. Nivel de intensidad observado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">Tipo de incidente de desregulación observado (selecciona todos los que apliquen)</label>
                            <div className="flex flex-wrap gap-2">
                                {CONDUCT_TYPES.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => toggleItem(conductTypes, setConductTypes, c)}
                                        className={`rounded-full border px-3 py-1 text-xs transition-all ${conductTypes.includes(c) ? "border-indigo-500 bg-indigo-100 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                            {conductTypes.includes("Otro") && (
                                <input type="text" className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Especifique otro..." value={conductOther} onChange={(e) => setConductOther(e.target.value)} />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">Nivel de intensidad observado <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <button type="button" onClick={() => setSeverity("moderada")} className={`rounded-lg border p-4 text-left transition-all ${severity === "moderada" ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-slate-200 hover:border-slate-300"}`}>
                                    <p className="text-sm font-semibold text-amber-700">Etapa 2 — Moderada</p>
                                    <p className="mt-1 text-xs text-slate-500">Aumento de la DEC, ausencia de autocontroles inhibitorios cognitivos y riesgo para sí mismo/a o terceros.</p>
                                </button>
                                <button type="button" onClick={() => setSeverity("severa")} className={`rounded-lg border p-4 text-left transition-all ${severity === "severa" ? "border-rose-500 bg-rose-50 ring-1 ring-rose-500" : "border-slate-200 hover:border-slate-300"}`}>
                                    <p className="text-sm font-semibold text-rose-700">Etapa 3 — Severa</p>
                                    <p className="mt-1 text-xs text-slate-500">Descontrol y riesgos que implican la necesidad de contener físicamente.</p>
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN 7: Situaciones desencadenantes */}
            {step === 5 && (
                <Card>
                    <CardHeader>
                        <CardTitle>7. Descripción situaciones desencadenantes</CardTitle>
                        <CardDescription>
                            ¿Qué situaciones pudieron desencadenar la desregulación?
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {TRIGGERS.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleItem(triggers, setTriggers, t)}
                                    className={`rounded-full border px-3 py-1 text-xs transition-all ${triggers.includes(t) ? "border-indigo-500 bg-indigo-100 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        {triggers.includes("Otro") && (
                            <div className="mt-3">
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                    placeholder="Especifique otra situación desencadenante..."
                                    value={triggerOther}
                                    onChange={(e) => setTriggerOther(e.target.value)}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Acciones de intervención y observaciones */}
            {step === 6 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Acciones de intervención y observaciones</CardTitle>
                        <CardDescription>
                            Acciones desplegadas y observaciones adicionales.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">Acciones realizadas</label>
                            <div className="flex flex-wrap gap-2">
                                {ACTIONS.map((a) => (
                                    <button key={a} type="button" onClick={() => toggleItem(actions, setActions, a)} className={`rounded-full border px-3 py-1 text-xs transition-all ${actions.includes(a) ? "border-indigo-500 bg-indigo-100 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                                        {a}
                                    </button>
                                ))}
                            </div>
                            {actions.includes("Otro") && (
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                        placeholder="Especifique otra acción..."
                                        value={actionOther}
                                        onChange={(e) => setActionOther(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-900">Observaciones adicionales <span className="text-slate-400 font-normal">(opcional)</span></label>
                                <button type="button" onClick={toggleDictation} className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${isListening ? "bg-rose-100 text-rose-600 animate-pulse ring-2 ring-rose-300 ring-offset-1" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`} title={isListening ? "Detener dictado" : "Iniciar dictado por voz"}>
                                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                </button>
                            </div>
                            <Textarea rows={4} placeholder="Describe en detalle lo que ocurrió, contexto adicional..." value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Navegación entre pasos */}
            <div className="mt-4 flex items-center justify-between gap-3">
                {step > 1 && (
                    <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                        ← Anterior
                    </Button>
                )}
                <div className="flex-1" />
                {step < TOTAL_STEPS ? (
                    <Button onClick={() => setStep((s) => s + 1)}>
                        Siguiente →
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-rose-600 hover:bg-rose-700"
                    >
                        {loading ? "Guardando..." : "Reportar DEC"}
                    </Button>
                )}
            </div>
        </div>
    )
}
