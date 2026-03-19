"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
    const [actionType, setActionType] = useState("")
    const [actionDesc, setActionDesc] = useState("")
    const [loading, setLoading] = useState(false)

    const handleAssignMe = async () => {
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
                            <p className="text-sm text-slate-700">{isDocente ? "Información reservada por privacidad." : caso.reason}</p>
                            <p className="text-xs text-slate-400 mt-2">
                                Abierto por: {caso.creador?.name} {caso.creador?.last_name} ({format(new Date(caso.created_at), "d MMM yyyy", { locale: es })})
                            </p>
                        </div>

                        <div className="pt-2 border-t">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Responsable</p>
                            {responsable ? (
                                <p className="text-sm font-medium text-slate-900">{responsable.name} {responsable.last_name}</p>
                            ) : (
                                <div className="space-y-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Sin asignar</span>
                                    {!isDocente && !isClosed && (
                                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleAssignMe}>
                                            <UserPlus className="w-3 h-3 mr-2" /> Asignarme el caso
                                        </Button>
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
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <h4 className="text-sm font-semibold text-slate-900">{getActionLabel(act.action_type)}</h4>
                                                <span className="text-xs text-slate-400">
                                                    {format(new Date(act.created_at), "d MMM yyyy HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-1 text-slate-700">{act.description}</p>
                                            <p className="text-xs text-slate-400 mt-2">
                                                Registrado por: {act.users?.name} {act.users?.last_name}
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
                            <label className="text-sm font-medium">Descripción y resultados</label>
                            <Textarea 
                                placeholder="Escriba los detalles de la intervención..." 
                                value={actionDesc}
                                onChange={(e) => setActionDesc(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-row items-center justify-between sm:justify-between w-full">
                        <Button 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAddAction(true)}
                            disabled={loading}
                        >
                            Cerrar Caso Definitivamente
                        </Button>
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
        </div>
    )
}
