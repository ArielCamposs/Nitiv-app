"use client"

import { useState } from "react"
import { NuevoCasoDialog } from "./nuevo-caso-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

type Caso = any
type Student = any
type Professional = any

interface Props {
    casos: Caso[]
    students: Student[]
    professionals: Professional[]
    institutionId: string
    userId: string
    userRole: string
    userName: string
}

export function CasosPageContent({ casos, students, professionals, institutionId, userId, userRole, userName }: Props) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const isDocente = userRole === "docente"
    
    // Contadores
    const urgentes = casos.filter(c => c.initial_state === 'urgente' && c.status !== 'cerrado').length
    const enSeguimiento = casos.filter(c => c.status === 'en_proceso' || c.status === 'atendido').length
    const sinAsignar = casos.filter(c => !c.responsable_id && c.status !== 'cerrado').length
    const totales = casos.filter(c => c.status !== 'cerrado').length

    const handleAssignToMe = async (caseId: string) => {
        try {
            const { error: updError } = await supabase
                .from("student_cases")
                .update({ responsable_id: userId, status: 'en_proceso' })
                .eq("id", caseId)
            
            if (updError) throw updError

            const { error: actError } = await supabase
                .from("student_case_actions")
                .insert({
                    case_id: caseId,
                    created_by: userId,
                    action_type: 'asignacion',
                    description: 'Caso asignado a mi bandeja.'
                })
            
            if (actError) throw actError

            toast.success("Te has asignado el caso correctamente.")
            router.refresh()
            router.push(`/monitoreo/${caseId}`)
        } catch (e: any) {
            toast.error("Error al asignar el caso.")
        }
    }

    const getUrgencyBadge = (initialState: string, responsable: any) => {
        const respText = responsable ? `Ps. ${responsable.name} ${responsable.last_name}` : 'Sin asignar'
        if (initialState === 'urgente') {
            return (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                    Urgente - {respText}
                </span>
            )
        }
        if (initialState === 'observacion') {
            return (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                    Media - {respText}
                </span>
            )
        }
        return (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                Baja - {respText}
            </span>
        )
    }

    const renderActionsSummary = (actions: any[]) => {
        if (!actions || actions.length === 0) {
            return <span className="text-xs text-slate-500 font-medium">Sin acciones aún</span>
        }
        
        // Filtra asignaciones y notas para mostrar solo "intervenciones" reales a la izquierda
        const realActions = actions.filter(a => a.action_type !== 'asignacion' && a.action_type !== 'nota')
        
        if (realActions.length === 0) {
            return <span className="text-xs text-slate-500 font-medium">Asignado, en espera de acciones...</span>
        }

        const lastAction = realActions[0]
        let label = "Intervención ✓"
        if (lastAction.action_type === 'entrevista_estudiante') label = "Entrevista individual ✓"
        if (lastAction.action_type === 'monitoreo') label = "Monitoreo ✓"
        if (lastAction.action_type === 'contacto_familia') label = "Contacto familia ✓"

        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {label}
                </span>
                {realActions.length > 1 && (
                    <span className="text-xs text-slate-500 font-medium">+{realActions.length - 1} acciones más</span>
                )}
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Derivación y monitoreo</h1>
                    <p className="text-slate-500 mt-1">
                        {isDocente ? "Mis derivaciones enviadas al equipo." : "Bandeja de convivencia y dupla psicosocial."}
                    </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Abrir nuevo caso
                </Button>
            </div>

            {/* Contenedor principal estilo Nitiv */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                
                {/* Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-rose-600">{urgentes}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Urgentes</p>
                    </div>
                    <div className="p-4 text-center border-l border-slate-200">
                        <p className="text-2xl font-bold text-amber-600">{enSeguimiento}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">En seguimiento</p>
                    </div>
                    <div className="p-4 text-center md:border-l border-slate-200 border-t md:border-t-0">
                        <p className="text-2xl font-bold text-emerald-600">{sinAsignar}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Sin asignar</p>
                    </div>
                    <div className="p-4 text-center border-l border-slate-200 border-t md:border-t-0">
                        <p className="text-2xl font-bold text-slate-900">{totales}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total activos</p>
                    </div>
                </div>

                {/* Listado de Tarjetas */}
                <div className="p-4 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50/30">
                    {casos.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No hay casos en la bandeja.
                        </div>
                    ) : (
                        casos.map((caso) => (
                            <div key={caso.id} className="relative bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all shadow-sm">
                                
                                {/* Badge Superior Derecha */}
                                <div className="absolute top-5 right-5 hidden md:block">
                                    {getUrgencyBadge(caso.initial_state, caso.responsable)}
                                </div>

                                {/* Información Principal */}
                                <div className="pr-0 md:pr-48">
                                    <h3 className="font-bold text-lg text-slate-900">
                                        {caso.students.name} {caso.students.last_name}
                                    </h3>
                                    
                                    <div className="flex flex-wrap items-center text-xs text-slate-500 mt-1 gap-2">
                                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                            {caso.students.courses?.name} {caso.students.courses?.section}
                                        </span>
                                        <span>•</span>
                                        <span>Derivado por Prof. {caso.creador?.last_name}</span>
                                        <span>•</span>
                                        <span>Hace {formatDistanceToNow(new Date(caso.created_at), { locale: es })}</span>
                                    </div>

                                    {/* Mobile Badge */}
                                    <div className="mt-3 block md:hidden">
                                        {getUrgencyBadge(caso.initial_state, caso.responsable)}
                                    </div>

                                    {/* Chips de Motivo (Truncated for design) */}
                                    <div className="mt-4 text-sm text-slate-700 leading-relaxed">
                                        {isDocente ? (
                                            <span className="italic text-slate-400">Información confidencial reservada.</span>
                                        ) : (
                                            <div className="line-clamp-2 md:line-clamp-3">
                                                {caso.reason.split('\n').map((line: string, i: number) => (
                                                    <span key={i} className="inline-block mr-1">
                                                        {line}
                                                        {i === 0 && caso.reason.includes('\n') ? ' • ' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones y Footer */}
                                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        {!isDocente ? renderActionsSummary(caso.actions) : <span className="text-xs text-slate-400 font-medium">Solo visible por equipo</span>}
                                    </div>
                                    <div className="self-end sm:self-auto">
                                        {!caso.responsable && !isDocente ? (
                                            <button 
                                                onClick={() => handleAssignToMe(caso.id)}
                                                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
                                            >
                                                Abrir y asignar <span aria-hidden="true">&rarr;</span>
                                            </button>
                                        ) : (
                                            <Link 
                                                href={`/monitoreo/${caso.id}`}
                                                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
                                            >
                                                Ver caso <span aria-hidden="true">&rarr;</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <NuevoCasoDialog 
                isOpen={isDialogOpen} 
                onClose={() => setIsDialogOpen(false)} 
                students={students}
                userId={userId}
                institutionId={institutionId}
                userName={userName}
            />
        </div>
    )
}
