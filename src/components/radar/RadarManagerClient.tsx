"use client"

import { useState, useTransition } from "react"
import { toggleRadarSession, type RadarPeriod } from "@/actions/radar"
import { toast } from "sonner"
import { ChevronDown, Loader2, CheckCircle2, XCircle, BarChart3, Plus } from "lucide-react"
import Link from "next/link"

const PERIOD_LABELS: Record<RadarPeriod, string> = {
    inicio_s1:  "Inicio Semestre 1",
    termino_s1: "Término Semestre 1",
    inicio_s2:  "Inicio Semestre 2",
    termino_s2: "Término Semestre 2",
}
const ALL_PERIODS: RadarPeriod[] = ["inicio_s1", "termino_s1", "inicio_s2", "termino_s2"]

export interface SessionInfo {
    id: string
    period: RadarPeriod
    active: boolean
    activated_at: string
    response_count: number
}

export interface CourseWithSessions {
    id: string
    name: string
    section?: string | null
    sessions: SessionInfo[]
}

interface Props {
    courses: CourseWithSessions[]
    institutionId: string
    role: "dupla" | "convivencia"
}

export function RadarManagerClient({ courses, institutionId, role }: Props) {
    const [isPending, startTransition] = useTransition()
    const [loadingKey, setLoadingKey] = useState<string | null>(null)
    // Per course: which period is selected in dropdown
    const [selectedPeriod, setSelectedPeriod] = useState<Record<string, RadarPeriod | "">>({})
    // Track sessions state locally (mirror initial data, then update)
    const [sessionData, setSessionData] = useState<Record<string, SessionInfo[]>>(
        Object.fromEntries(courses.map(c => [c.id, c.sessions]))
    )

    const handleToggle = (courseId: string, period: RadarPeriod, activate: boolean) => {
        const key = `${courseId}-${period}`
        setLoadingKey(key)
        startTransition(async () => {
            const result = await toggleRadarSession(courseId, period, activate, institutionId)
            if (result.success) {
                setSessionData(prev => {
                    const sessions = [...(prev[courseId] ?? [])]
                    const idx = sessions.findIndex(s => s.period === period)
                    if (idx >= 0) {
                        sessions[idx] = { ...sessions[idx], active: activate }
                    } else {
                        sessions.push({ id: "", period, active: true, activated_at: new Date().toISOString(), response_count: 0 })
                    }
                    return { ...prev, [courseId]: sessions }
                })
                toast.success(activate ? "Radar activado para este período" : "Radar desactivado")
            } else {
                toast.error(result.error ?? "Error al cambiar el estado")
            }
            setLoadingKey(null)
        })
    }

    const handleActivate = (courseId: string) => {
        const period = selectedPeriod[courseId] as RadarPeriod
        if (!period) { toast.error("Selecciona un período primero"); return }
        handleToggle(courseId, period, true)
        setSelectedPeriod(prev => ({ ...prev, [courseId]: "" }))
    }

    return (
        <div className="space-y-4">
            {courses.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No hay cursos activos en tu institución.</p>
            )}

            {courses.map(course => {
                const sessions = sessionData[course.id] ?? []
                const activePeriods = sessions.filter(s => s.active).map(s => s.period)
                const usedPeriods = new Set(sessions.map(s => s.period))
                const availablePeriods = ALL_PERIODS.filter(p => !usedPeriods.has(p))
                const courseName = `${course.name}${course.section ? " " + course.section : ""}`

                return (
                    <div key={course.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        {/* Course header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{courseName}</span>
                                {activePeriods.length > 0 && (
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                        {activePeriods.length} activo{activePeriods.length > 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-4 space-y-3">
                            {/* Existing sessions */}
                            {sessions.map(s => {
                                const key = `${course.id}-${s.period}`
                                const isLoading = loadingKey === key
                                return (
                                    <div key={s.period} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${s.active ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            {s.active
                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                                            }
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate">{PERIOD_LABELS[s.period]}</p>
                                                <p className="text-[10px] text-slate-400">{s.response_count} respuesta{s.response_count !== 1 ? "s" : ""}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {s.id && (
                                                <Link
                                                    href={`/${role}/radar/resultados/${s.id}`}
                                                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                                                >
                                                    <BarChart3 className="w-3 h-3" />
                                                    Resultados
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => handleToggle(course.id, s.period, !s.active)}
                                                disabled={isLoading || isPending}
                                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all disabled:opacity-50 ${s.active ? "text-slate-600 border-slate-200 hover:border-rose-200 hover:text-rose-600" : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"}`}
                                            >
                                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : s.active ? "Desactivar" : "Reactivar"}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Activate new period */}
                            {availablePeriods.length > 0 && (
                                <div className="flex items-center gap-2 pt-1">
                                    <div className="relative flex-1">
                                        <select
                                            value={selectedPeriod[course.id] ?? ""}
                                            onChange={e => setSelectedPeriod(prev => ({ ...prev, [course.id]: e.target.value as RadarPeriod | "" }))}
                                            className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 pr-7 appearance-none bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        >
                                            <option value="">Seleccionar período...</option>
                                            {availablePeriods.map(p => (
                                                <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                    <button
                                        onClick={() => handleActivate(course.id)}
                                        disabled={!selectedPeriod[course.id] || isPending}
                                        className="flex items-center gap-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-40 shadow-sm shrink-0"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Activar
                                    </button>
                                </div>
                            )}

                            {sessions.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-2">Sin períodos activados aún.</p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
