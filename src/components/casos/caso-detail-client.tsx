"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { rememberPendingCaseStatus } from "@/lib/case-status-pending"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { 
    UserPlus, CheckCircle, Clock, FileText, Phone, Users, User, ArrowRight, ShieldAlert 
} from "lucide-react"

type Caso = any
type Action = any

function ExpandableText({
    text,
    maxLength = 260,
    className = "",
}: {
    text?: string | null
    maxLength?: number
    className?: string
}) {
    const value = (text ?? "").trim()
    const [expanded, setExpanded] = useState(false)

    if (!value) return <p className={`text-sm text-slate-700 ${className}`}>No registrado</p>

    const needsCollapse = value.length > maxLength
    const visible = needsCollapse && !expanded ? `${value.slice(0, maxLength)}...` : value

    return (
        <div className="space-y-1">
            <p className={`text-sm text-slate-700 whitespace-pre-wrap break-all [overflow-wrap:anywhere] max-w-full ${className}`}>{visible}</p>
            {needsCollapse && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setExpanded((prev) => !prev)
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                    {expanded ? "Leer menos" : "Leer más"}
                </button>
            )}
        </div>
    )
}

function TruncatedText({
    text,
    maxLength = 260,
    className = "",
}: {
    text?: string | null
    maxLength?: number
    className?: string
}) {
    const value = (text ?? "").trim()
    if (!value) return <p className={`text-sm text-slate-700 ${className}`}>No registrado</p>
    const visible = value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
    return <p className={`text-sm text-slate-700 whitespace-pre-wrap break-all [overflow-wrap:anywhere] max-w-full ${className}`}>{visible}</p>
}

function splitReasonAndObservation(rawReason?: string | null): {
    reasons: string[]
    observation: string | null
} {
    const value = (rawReason ?? "").trim()
    if (!value) return { reasons: [], observation: null }

    const marker = "\n\nObs:"
    const markerIndex = value.indexOf(marker)

    const reasonsPart = markerIndex >= 0 ? value.slice(0, markerIndex).trim() : value
    const observationPart = markerIndex >= 0 ? value.slice(markerIndex + marker.length).trim() : ""

    const reasons = reasonsPart
        .split(" • ")
        .map((item) => item.trim())
        .filter(Boolean)

    return {
        reasons,
        observation: observationPart || null,
    }
}

const ROLE_LABELS: Record<string, string> = {
    docente: "Docente",
    dupla: "Dupla",
    convivencia: "Convivencia",
    inspector: "Inspectoría",
    utp: "UTP",
    director: "Dirección",
    admin: "Admin",
}

type InvolvedStudent = { id: string; name: string; last_name: string }

function parseParticipantIds(raw: unknown): string[] {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean)
    if (typeof raw === "string") {
        try {
            const p = JSON.parse(raw)
            return Array.isArray(p) ? p.map((x) => String(x)).filter(Boolean) : []
        } catch {
            return []
        }
    }
    return []
}

/** Texto guardado en `description` si no existe la columna JSONB (migración pendiente). */
const PARTICIPANTS_DESC_REGEX = /^\[Participan:\s*([^\]]+)]\s*\n\n/

function participantsLineFromDescription(desc?: string | null): string | null {
    const m = (desc ?? "").match(PARTICIPANTS_DESC_REGEX)
    return m ? m[1].trim() : null
}

function stripParticipantsPrefixFromDescription(desc?: string | null): string {
    return (desc ?? "").replace(PARTICIPANTS_DESC_REGEX, "").trim()
}

/** No usar `select=*` tras insert: PostgREST puede fallar si `participant_student_ids` no está en caché. */
const ACTION_INSERT_SELECT = "id, action_type, description, created_at, users(name, last_name, role)"

const SEVERITY_LABELS: Record<string, string> = {
    leve: "Leve",
    moderada: "Mediano",
    grave: "Grave",
    gravisimo: "Gravísimo",
    "n/a": "No aplica",
}

export function CasoDetailClient({
    caso,
    initialActions,
    userId,
    userRole,
    convivenciaRecord,
}: {
    caso: Caso
    initialActions: Action[]
    userId: string
    userRole: string
    convivenciaRecord?: any
}) {
    const supabase = createClient()
    const router = useRouter()
    
    const [actions, setActions] = useState<Action[]>(initialActions)
    const [status, setStatus] = useState(caso.status)
    const [responsable, setResponsable] = useState(caso.responsable)

    const isDocente = userRole === "docente"
    const isClosed = status === "cerrado"
    
    // UI state
    const [isActionModalOpen, setIsActionModalOpen] = useState(false)
    const [selectedIntervention, setSelectedIntervention] = useState<Action | null>(null)
    const [actionType, setActionType] = useState("")
    const [actionDesc, setActionDesc] = useState("")
    const [interventionParticipantIds, setInterventionParticipantIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    const involvedStudentsFromConvivencia: InvolvedStudent[] = useMemo(() => {
        const rows = convivenciaRecord?.convivencia_record_students
        if (!Array.isArray(rows)) return []
        const out: InvolvedStudent[] = []
        for (const rs of rows) {
            const sid = (rs as { student_id?: string })?.student_id ?? (rs as { students?: { id?: string } })?.students?.id
            const s = (rs as { students?: { name?: string; last_name?: string } })?.students
            if (sid && s) {
                out.push({
                    id: String(sid),
                    name: String(s.name ?? ""),
                    last_name: String(s.last_name ?? ""),
                })
            }
        }
        return out
    }, [convivenciaRecord])

    const needsInterventionParticipantPick = involvedStudentsFromConvivencia.length > 1

    const studentLabelById = useMemo(() => {
        const m = new Map<string, string>()
        for (const s of involvedStudentsFromConvivencia) {
            m.set(s.id, `${s.last_name}, ${s.name}`.trim())
        }
        if (caso?.students?.id) {
            const st = caso.students
            m.set(
                String(st.id),
                `${st.last_name ?? ""}, ${st.name ?? ""}`.trim()
            )
        }
        return m
    }, [involvedStudentsFromConvivencia, caso?.students])

    const formatParticipantLine = (act: Action) => {
        const ids = parseParticipantIds(act.participant_student_ids)
        if (ids.length > 0) {
            const labels = ids.map((id) => studentLabelById.get(id) ?? `Estudiante (${id.slice(0, 8)}…)`)
            return labels.join(" · ")
        }
        return participantsLineFromDescription(act.description)
    }

    const toggleInterventionParticipant = (id: string) => {
        setInterventionParticipantIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const selectAllInterventionParticipants = () => {
        setInterventionParticipantIds(involvedStudentsFromConvivencia.map((s) => s.id))
    }

    const clearInterventionParticipants = () => setInterventionParticipantIds([])

    useEffect(() => {
        const onCaseClosed = (event: Event) => {
            const customEvent = event as CustomEvent<{ caseId: string }>
            if (customEvent.detail?.caseId === caso.id) {
                setStatus("cerrado")
                setIsActionModalOpen(false)
            }
        }

        window.addEventListener("student-case-closed", onCaseClosed)
        return () => window.removeEventListener("student-case-closed", onCaseClosed)
    }, [caso.id])

    const parseAllowedRoles = (derivedTo: unknown): string[] => {
        // Por defecto, si no hay roles especificados, permitimos dupla y convivencia
        const defaultRoles = ["dupla", "convivencia"]
        
        if (!derivedTo) return defaultRoles

        if (Array.isArray(derivedTo) && derivedTo.length > 0) {
            return derivedTo.map((v) => String(v).trim().toLowerCase()).filter(Boolean)
        }

        const raw = String(derivedTo).trim()
        if (!raw || raw === "[]" || raw === "null") return defaultRoles

        try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((v) => String(v).trim().toLowerCase()).filter(Boolean)
            }
        } catch {
            // Sigue con parsing flexible si no era JSON.
        }

        const split = raw
            .split(/[|,]/g)
            .map((v) => v.trim().toLowerCase())
            .map((v) => {
                if (v.includes("conviv")) return "convivencia"
                if (v.includes("dupla") || v.includes("psicolog")) return "dupla"
                if (v.includes("inspector")) return "inspector"
                if (v.includes("utp") || v.includes("orientador")) return "utp"
                return v
            })
            .filter(Boolean)

        return split.length > 0 ? split : defaultRoles
    }

    const allowedRoles = parseAllowedRoles(caso.derived_to)
    // Se elimina 'director' de los roles permitidos por defecto para tomar casos
    const canTakeCaseByRole = allowedRoles.includes(userRole) || userRole === "admin"
    const { reasons: parsedReasons, observation: parsedObservation } = splitReasonAndObservation(caso.reason)
    const DERIVED_ROLE_LABELS: Record<string, string> = {
        dupla: "Dupla psicosocial",
        convivencia: "Convivencia",
        inspector: "Inspectoría",
        utp: "UTP",
    }
    const derivedToLabels = allowedRoles.map((role) => DERIVED_ROLE_LABELS[role] ?? role)

    const handleAssignMe = async () => {
        if (!canTakeCaseByRole) {
            toast.error("Tu rol no está autorizado para tomar este caso.")
            return
        }

        try {
            const { error } = await supabase
                .from("student_cases")
                .update({ responsable_id: userId, status: 'en_proceso' })
                .eq("id", caso.id)
            if (error) throw error

            const { data: actData, error: actError } = await supabase
                .from("student_case_actions")
                .insert({ case_id: caso.id, created_by: userId, action_type: 'asignacion', description: 'Caso asignado a mi bandeja.' })
                .select(ACTION_INSERT_SELECT)
                .maybeSingle()
            if (actError) throw actError
            if (!actData) throw new Error("Sin datos de asignación")

            setStatus("en_proceso")
            setResponsable({ name: "Mí", last_name: "(Usuario actual)", role: userRole })
            setActions([actData, ...actions])
            toast.success("Te has asignado el caso.")
        } catch (e) {
            toast.error("Error al asignar.")
        }
    }

    const handleAddAction = async (isClosing = false) => {
        if (!actionType || !actionDesc.trim()) {
            toast.error("Debes seleccionar un tipo de acción y escribir un detalle.")
            return
        }

        if (needsInterventionParticipantPick && interventionParticipantIds.length === 0) {
            toast.error("Este caso tiene varios estudiantes involucrados. Indica quiénes participan en esta intervención.")
            return
        }

        try {
            setLoading(true)
            const { data: currentCase, error: currentCaseError } = await supabase
                .from("student_cases")
                .select("status")
                .eq("id", caso.id)
                .maybeSingle()

            if (currentCaseError) throw currentCaseError
            if (currentCase?.status === "cerrado") {
                setStatus("cerrado")
                setIsActionModalOpen(false)
                toast.error("El caso ya está cerrado. No se pueden agregar intervenciones.")
                return
            }

            const type = isClosing ? 'cierre' : actionType
            const newStatus = isClosing ? 'cerrado' : 'en_proceso'

            // Actualizar status del caso si es cierre
            if (isClosing) {
                const { error: updErr } = await supabase.from("student_cases").update({ status: 'cerrado' }).eq("id", caso.id)
                if (updErr) throw updErr
            } else if (status === 'pendiente') {
                await supabase.from("student_cases").update({ status: 'en_proceso' }).eq("id", caso.id)
                setStatus('en_proceso')
            }

            const baseInsert = {
                case_id: caso.id,
                created_by: userId,
                action_type: type,
                description: actionDesc.trim(),
            }

            const withParticipantsJson = {
                ...baseInsert,
                /** JSON array; PostgREST escribe en columna jsonb */
                participant_student_ids: interventionParticipantIds,
            }

            let actData: Action | null = null
            let actError = null as { message?: string; code?: string } | null

            if (needsInterventionParticipantPick && interventionParticipantIds.length > 0) {
                const first = await supabase
                    .from("student_case_actions")
                    .insert(withParticipantsJson)
                    .select(ACTION_INSERT_SELECT)
                    .maybeSingle()
                actData = first.data as Action | null
                actError = first.error

                if (actError) {
                    const participantsLine = interventionParticipantIds
                        .map((id) => studentLabelById.get(id) ?? id)
                        .join(" · ")
                    const descriptionWithParticipants = `[Participan: ${participantsLine}]\n\n${actionDesc.trim()}`
                    const second = await supabase
                        .from("student_case_actions")
                        .insert({
                            case_id: caso.id,
                            created_by: userId,
                            action_type: type,
                            description: descriptionWithParticipants,
                        })
                        .select(ACTION_INSERT_SELECT)
                        .maybeSingle()
                    actData = second.data as Action | null
                    actError = second.error
                    if (!actError) {
                        toast.warning(
                            "Intervención guardada. Aplica la migración de participantes en la base de datos para guardarlos en campo dedicado."
                        )
                    }
                } else if (!actData) {
                    actError = { message: "La acción no se devolvió al guardar." }
                } else {
                    actData = {
                        ...actData,
                        participant_student_ids: interventionParticipantIds,
                    } as Action
                }
            } else {
                const res = await supabase
                    .from("student_case_actions")
                    .insert(baseInsert)
                    .select(ACTION_INSERT_SELECT)
                    .maybeSingle()
                actData = res.data as Action | null
                actError = res.error
            }

            if (actError) {
                toast.error(actError.message || "Error al guardar la acción.")
                return
            }
            if (!actData) {
                toast.error("No se pudo registrar la intervención.")
                return
            }

            if (isClosing) setStatus('cerrado')
            setActions([actData, ...actions])
            toast.success(isClosing ? "Caso cerrado exitosamente." : "Intervención guardada.")

            if (isClosing && typeof window !== "undefined") {
                rememberPendingCaseStatus(caso.id, "cerrado")
                window.dispatchEvent(
                    new CustomEvent("student-case-closed", { detail: { caseId: caso.id } })
                )
                router.refresh()
            }

            setIsActionModalOpen(false)
            setActionType("")
            setActionDesc("")
            setInterventionParticipantIds([])
        } catch (e) {
            const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : ""
            toast.error(msg || "Error al guardar la acción.")
        } finally {
            setLoading(false)
        }
    }

    const getActionIcon = (type: string) => {
        switch(type) {
            case 'asignacion': return <UserPlus className="w-4 h-4 text-blue-500" />
            case 'entrevista_estudiante': return <User className="w-4 h-4 text-indigo-500" />
            case 'contacto_familia': return <Phone className="w-4 h-4 text-green-500" />
            case 'coordinacion_interna': return <Users className="w-4 h-4 text-purple-500" />
            case 'monitoreo': return <Clock className="w-4 h-4 text-amber-500" />
            case 'derivacion_externa': return <ArrowRight className="w-4 h-4 text-rose-500" />
            case 'cierre': return <CheckCircle className="w-4 h-4 text-slate-500" />
            case 'nota': default: return <FileText className="w-4 h-4 text-slate-400" />
        }
    }

    const getActionLabel = (type: string) => {
        const labels: Record<string, string> = {
            asignacion: "Asignación de responsable",
            entrevista_estudiante: "Entrevista con estudiante",
            contacto_familia: "Contacto con familia",
            coordinacion_interna: "Coordinación interna",
            monitoreo: "Monitoreo en aula",
            derivacion_externa: "Derivación externa",
            cierre: "Cierre de caso",
            nota: "Nota / Observación"
        }
        return labels[type] || "Otro"
    }

    return (
        <div className="space-y-6">
            {convivenciaRecord && !isDocente && (
                <Card className="border-violet-200 bg-violet-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="w-4 h-4 text-violet-600" />
                            Registro de convivencia (origen del caso)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {convivenciaRecord.event_title?.trim() && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-0.5">Título</p>
                                    <p className="font-medium text-slate-900">{convivenciaRecord.event_title.trim()}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-0.5">Tipo</p>
                                <p className="text-slate-700">{convivenciaRecord.type || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-0.5">Fecha y hora</p>
                                <p className="text-slate-700">
                                    {convivenciaRecord.incident_date
                                        ? format(new Date(convivenciaRecord.incident_date), "d MMM yyyy HH:mm", { locale: es })
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-0.5">Gravedad</p>
                                <p className="text-slate-700">
                                    {SEVERITY_LABELS[convivenciaRecord.severity] ?? convivenciaRecord.severity ?? "—"}
                                </p>
                            </div>
                            {convivenciaRecord.location && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-0.5">Lugar</p>
                                    <p className="text-slate-700">{convivenciaRecord.location}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Descripción</p>
                            <ExpandableText text={convivenciaRecord.description} maxLength={300} className="rounded-lg bg-white/80 p-3 border border-violet-100" />
                        </div>
                        {(convivenciaRecord.convivencia_record_students?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Estudiantes involucrados</p>
                                <div className="flex flex-wrap gap-2">
                                    {convivenciaRecord.convivencia_record_students.map((rs: any) => {
                                        const s = rs?.students
                                        if (!s) return null
                                        const course = s.courses ?? s.course
                                        const courseLabel = course ? `${course.name ?? ""}${course.section ? ` ${course.section}` : ""}`.trim() : ""
                                        return (
                                            <span
                                                key={s.id}
                                                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-100/80 text-violet-800 text-xs font-medium border border-violet-200"
                                            >
                                                {s.last_name}, {s.name}
                                                {courseLabel && ` — ${courseLabel}`}
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {convivenciaRecord.actions_taken?.length > 0 && (
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Acciones inmediatas (registro)</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {convivenciaRecord.actions_taken.map((a: string) => (
                                        <span key={a} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {convivenciaRecord.agreements?.trim() && (
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Acuerdos</p>
                                <ExpandableText text={convivenciaRecord.agreements} maxLength={200} />
                            </div>
                        )}
                        {convivenciaRecord.resolved && convivenciaRecord.resolution_notes?.trim() && (
                            <div className="pt-2 border-t border-violet-200">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Notas de cierre (convivencia)</p>
                                <ExpandableText text={convivenciaRecord.resolution_notes} maxLength={200} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Info Panel */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <CardTitle className="text-lg">Información del caso</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Estudiante(s)</p>
                            {involvedStudentsFromConvivencia.length > 0 ? (
                                <div className="space-y-1">
                                    {involvedStudentsFromConvivencia.map(s => (
                                        <div key={s.id}>
                                            <p className="font-medium text-slate-900">{s.name} {s.last_name}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <p className="font-medium text-slate-900">{caso.students.name} {caso.students.last_name}</p>
                                    <p className="text-sm text-slate-500">{caso.students.courses?.name} {caso.students.courses?.section}</p>
                                </div>
                            )}
                        </div>
                        
                        {!isDocente && (
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold">Urgencia inicial</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                    caso.initial_state === 'urgente' ? 'bg-rose-100 text-rose-800' :
                                    caso.initial_state === 'observacion' ? 'bg-amber-100 text-amber-800' :
                                    'bg-emerald-100 text-emerald-800'
                                }`}>
                                    {caso.initial_state.toUpperCase()}
                                </span>
                            </div>
                        )}
                        
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold">Estado actual</p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                                status === 'cerrado' ? 'bg-slate-100 text-slate-700' :
                                status === 'atendido' ? 'bg-blue-100 text-blue-700' :
                                status === 'en_proceso' ? 'bg-indigo-100 text-indigo-700' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                                {status === 'en_proceso' ? 'EN PROCESO' : status.toUpperCase()}
                            </span>
                        </div>

                        <div className="pt-2 border-t">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Motivo de apertura</p>
                            {isDocente ? (
                                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                                    Información reservada por privacidad.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {parsedReasons.length > 0 ? (
                                        parsedReasons.map((item, idx) => (
                                            <div key={`reason-${idx}`} className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
                                                <ExpandableText text={item} maxLength={180} />
                                            </div>
                                        ))
                                    ) : (
                                        <ExpandableText text={caso.reason} maxLength={320} />
                                    )}

                                    {parsedObservation && (
                                        <div className="rounded-md bg-indigo-50/40 border border-indigo-100 px-3 py-2">
                                            <p className="text-xs text-indigo-600 font-semibold mb-1">Observación</p>
                                            <ExpandableText text={parsedObservation} maxLength={220} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                                Abierto por: {caso.creador?.name} {caso.creador?.last_name} ({format(new Date(caso.created_at), "d MMM yyyy", { locale: es })})
                            </p>
                        </div>

                        {!convivenciaRecord && (
                            <div className="pt-2 border-t space-y-2">
                                <p className="text-xs text-slate-500 uppercase font-semibold">Datos de la derivación</p>
                                <div>
                                    <p className="text-xs text-slate-400">Cuándo ocurre</p>
                                    <ExpandableText text={caso.when_occurs} maxLength={180} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Frecuencia</p>
                                    <ExpandableText text={caso.frequency} maxLength={180} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Derivado a</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                                        {derivedToLabels.length > 0 ? derivedToLabels.join(", ") : "No definido"}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Responsable</p>
                            {responsable ? (
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{responsable.name} {responsable.last_name}</p>
                                    {responsable.role && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {ROLE_LABELS[responsable.role] ?? responsable.role}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Sin asignar</span>
                                    {!isDocente && !isClosed && canTakeCaseByRole && (
                                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleAssignMe}>
                                            <UserPlus className="w-3 h-3 mr-2" /> Asignarme el caso
                                        </Button>
                                    )}
                                    {!isDocente && !isClosed && !canTakeCaseByRole && (
                                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                                            Solo roles derivados pueden tomar este caso.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Timeline Panel */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-white pb-4">
                        <CardTitle className="text-lg">Línea de tiempo de intervenciones</CardTitle>
                        {!isDocente && !isClosed && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setActionType("")
                                    setActionDesc("")
                                    setInterventionParticipantIds([])
                                    setIsActionModalOpen(true)
                                }}
                            >
                                + Añadir intervención
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isDocente ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-500 space-y-3">
                                <ShieldAlert className="w-10 h-10 text-slate-300" />
                                <p className="text-sm max-w-sm text-center">
                                    Por motivos de privacidad, los detalles clínicos o de intervención solo son visibles para los equipos de Dupla Psicosocial y Convivencia.
                                </p>
                            </div>
                        ) : actions.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 text-sm">
                                Aún no se han registrado acciones en este caso.
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {actions.map((act) => (
                                    <div key={act.id} className="relative pl-6 border-l-2 border-slate-100 last:border-transparent">
                                        <div className="absolute -left-2.5 bg-white p-1 rounded-full border border-slate-200">
                                            {getActionIcon(act.action_type)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <h4 className="text-sm font-semibold text-slate-900">{getActionLabel(act.action_type)}</h4>
                                                <span className="text-xs text-slate-400">
                                                    {format(new Date(act.created_at), "d MMM yyyy HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                            {formatParticipantLine(act) && (
                                                <p className="text-xs text-indigo-700 font-medium mt-1">
                                                    Participan: {formatParticipantLine(act)}
                                                </p>
                                            )}
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedIntervention(act)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault()
                                                        setSelectedIntervention(act)
                                                    }
                                                }}
                                                className="mt-1 text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded-sm"
                                            >
                                                <TruncatedText
                                                    text={stripParticipantsPrefixFromDescription(act.description)}
                                                    maxLength={260}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                                Registrado por: {act.users?.name} {act.users?.last_name}
                                                {act.users?.role ? ` (${ROLE_LABELS[act.users.role] ?? act.users.role})` : ""}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog
                open={isActionModalOpen}
                onOpenChange={(open) => {
                    setIsActionModalOpen(open)
                    if (!open) {
                        setInterventionParticipantIds([])
                        setActionType("")
                        setActionDesc("")
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Añadir Intervención</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {needsInterventionParticipantPick && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-3">
                                <p className="text-sm font-semibold text-amber-900">
                                    Estudiantes en esta intervención
                                </p>
                                <p className="text-xs text-amber-800/90">
                                    Hay más de un estudiante involucrado en el registro de convivencia. Indica a quiénes aplica esta intervención (puedes elegir varios o todos).
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs border-amber-300 bg-white"
                                        onClick={selectAllInterventionParticipants}
                                    >
                                        Todos los involucrados
                                    </Button>
                                    {interventionParticipantIds.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-amber-900"
                                            onClick={clearInterventionParticipants}
                                        >
                                            Limpiar selección
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {involvedStudentsFromConvivencia.map((s) => {
                                        const selected = interventionParticipantIds.includes(s.id)
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => toggleInterventionParticipant(s.id)}
                                                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                                    selected
                                                        ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                                        selected ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
                                                    }`}
                                                >
                                                    {selected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                                                </span>
                                                <span className="font-medium truncate">
                                                    {s.last_name}, {s.name}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                                {interventionParticipantIds.length === 0 && (
                                    <p className="text-xs font-medium text-red-700">
                                        Debes seleccionar al menos un estudiante para continuar.
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de acción</label>
                            <Select value={actionType} onValueChange={setActionType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="entrevista_estudiante">Entrevista con estudiante</SelectItem>
                                    <SelectItem value="contacto_familia">Contacto con familia</SelectItem>
                                    <SelectItem value="monitoreo">Monitoreo en aula</SelectItem>
                                    <SelectItem value="coordinacion_interna">Coordinación interna (profesores)</SelectItem>
                                    <SelectItem value="derivacion_externa">Derivación externa (salud, redes)</SelectItem>
                                    <SelectItem value="nota">Nota observacional</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Detalle de intervención</label>
                            <Textarea 
                                placeholder="Escriba los detalles de la intervención..." 
                                value={actionDesc}
                                onChange={(e) => setActionDesc(e.target.value)}
                                rows={8}
                                className="resize-y min-h-[140px] max-h-[420px] overflow-y-auto whitespace-pre-wrap break-all [overflow-wrap:anywhere] overflow-x-hidden"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-row items-center justify-between sm:justify-between w-full">
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsActionModalOpen(false)} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => handleAddAction(false)}
                                disabled={
                                    loading ||
                                    (needsInterventionParticipantPick && interventionParticipantIds.length === 0)
                                }
                            >
                                Guardar Intervención
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!selectedIntervention}
                onOpenChange={(open) => {
                    if (!open) setSelectedIntervention(null)
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedIntervention ? getActionLabel(selectedIntervention.action_type) : "Intervención"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-xs text-slate-500">
                            {selectedIntervention?.created_at
                                ? format(new Date(selectedIntervention.created_at), "d MMM yyyy HH:mm", { locale: es })
                                : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                            {selectedIntervention?.users
                                ? `Registrado por: ${selectedIntervention.users?.name ?? ""} ${selectedIntervention.users?.last_name ?? ""}${selectedIntervention.users?.role ? ` (${ROLE_LABELS[selectedIntervention.users.role] ?? selectedIntervention.users.role})` : ""}`
                                : ""}
                        </p>
                        {selectedIntervention && formatParticipantLine(selectedIntervention) && (
                            <p className="text-sm text-indigo-800 font-medium">
                                Participan en la intervención: {formatParticipantLine(selectedIntervention)}
                            </p>
                        )}
                        <div className="max-h-[50vh] max-w-full overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-slate-50 p-3 min-w-0">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap break-all [overflow-wrap:anywhere] max-w-full">
                                {stripParticipantsPrefixFromDescription(selectedIntervention?.description) || "—"}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedIntervention(null)}>
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
