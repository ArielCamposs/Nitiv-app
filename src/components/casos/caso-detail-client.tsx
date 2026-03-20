"use client"

import { useEffect, useState } from "react"
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

export function CasoDetailClient({ caso, initialActions, userId, userRole }: { caso: Caso, initialActions: Action[], userId: string, userRole: string }) {
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
    const [loading, setLoading] = useState(false)

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
        if (!derivedTo) return []

        if (Array.isArray(derivedTo)) {
            return derivedTo.map((v) => String(v).trim().toLowerCase()).filter(Boolean)
        }

        const raw = String(derivedTo).trim()
        if (!raw) return []

        try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
                return parsed.map((v) => String(v).trim().toLowerCase()).filter(Boolean)
            }
        } catch {
            // Sigue con parsing flexible si no era JSON.
        }

        return raw
            .split(/[|,]/g)
            .map((v) => v.trim().toLowerCase())
            .map((v) => {
                if (v.includes("conviv")) return "convivencia"
                if (v.includes("dupla") || v.includes("psicolog")) return "dupla"
                if (v.includes("inspector")) return "inspector"
                if (v.includes("utp") || v.includes("orientador")) return "utp"
                if (v.includes("director") || v.includes("direccion")) return "director"
                return v
            })
            .filter(Boolean)
    }

    const allowedRoles = parseAllowedRoles(caso.derived_to)
    const canTakeCaseByRole = allowedRoles.length === 0 || allowedRoles.includes(userRole)
    const { reasons: parsedReasons, observation: parsedObservation } = splitReasonAndObservation(caso.reason)
    const DERIVED_ROLE_LABELS: Record<string, string> = {
        dupla: "Dupla psicosocial",
        convivencia: "Convivencia",
        inspector: "Inspectoría",
        utp: "UTP",
        director: "Dirección",
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
                .select('*, users(name, last_name, role)').single()
            if (actError) throw actError

            setStatus("en_proceso")
            setResponsable({ name: "Mí", last_name: "(Usuario actual)" })
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

            const { data: actData, error: actError } = await supabase
                .from("student_case_actions")
                .insert({ case_id: caso.id, created_by: userId, action_type: type, description: actionDesc })
                .select('*, users(name, last_name, role)').single()
                
            if (actError) throw actError

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
        } catch (e) {
            toast.error("Error al guardar la acción.")
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Info Panel */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <CardTitle className="text-lg">Información del caso</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold">Estudiante</p>
                            <p className="font-medium text-slate-900">{caso.students.name} {caso.students.last_name}</p>
                            <p className="text-sm text-slate-500">{caso.students.courses?.name} {caso.students.courses?.section}</p>
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

                        <div className="pt-2 border-t">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Responsable</p>
                            {responsable ? (
                                <p className="text-sm font-medium text-slate-900">{responsable.name} {responsable.last_name}</p>
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
                            <Button size="sm" onClick={() => { setActionType(""); setIsActionModalOpen(true) }}>
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
                                            <div className="flex items-baseline gap-2">
                                                <h4 className="text-sm font-semibold text-slate-900">{getActionLabel(act.action_type)}</h4>
                                                <span className="text-xs text-slate-400">
                                                    {format(new Date(act.created_at), "d MMM yyyy HH:mm", { locale: es })}
                                                </span>
                                            </div>
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
                                                <TruncatedText text={act.description} maxLength={260} />
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

            <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Añadir Intervención</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
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
                            <Button onClick={() => handleAddAction(false)} disabled={loading}>
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
                        <div className="max-h-[50vh] max-w-full overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-slate-50 p-3 min-w-0">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap break-all [overflow-wrap:anywhere] max-w-full">
                                {selectedIntervention?.description}
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
