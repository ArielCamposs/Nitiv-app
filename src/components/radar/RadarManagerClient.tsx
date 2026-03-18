"use client"

import { useState, useTransition } from "react"
import { toggleRadarSession, getRadarSessionSummary, type RadarPeriod } from "@/actions/radar"
import { toast } from "sonner"
import { Loader2, CheckCircle2, XCircle, Plus, X, Users, CalendarDays, ExternalLink } from "lucide-react"
import Link from "next/link"

const ALL_PERIODS: RadarPeriod[] = ["inicio_s1", "termino_s1", "inicio_s2", "termino_s2"]

function scoreColor(avg: number): string {
    if (avg < 2.5) return "#ef4444" // rojo
    if (avg < 3.5) return "#f59e0b" // amarillo
    return "#22c55e"                // verde
}

const AXES_META: Record<string, { label: string; emoji: string; color: string }> = {
    ac: { label: "Autoconciencia",     emoji: "🧠", color: "#db2777" },
    ag: { label: "Autogestión",        emoji: "🎯", color: "#7c3aed" },
    cs: { label: "Conciencia Social",  emoji: "🤝", color: "#d97706" },
    hr: { label: "Hab. Relacionales",  emoji: "💬", color: "#4f46e5" },
    td: { label: "Toma de Decisiones", emoji: "⚖️", color: "#b45309" },
}
const AXIS_ORDER = ["ac", "ag", "cs", "hr", "td"]

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

type ModalData = {
    label: string
    sessionId: string
    activatedAt: string
    responseCount: number
    avgByAxis: Partial<Record<string, number>>
    loading: boolean
}

export function RadarManagerClient({ courses, institutionId, role }: Props) {
    const [isPending, startTransition] = useTransition()
    const [loadingKey, setLoadingKey] = useState<string | null>(null)
    const [sessionData, setSessionData] = useState<Record<string, SessionInfo[]>>(
        Object.fromEntries(courses.map(c => [c.id, c.sessions]))
    )
    const [modal, setModal] = useState<ModalData | null>(null)

    const handleToggle = (courseId: string, period: RadarPeriod, activate: boolean) => {
        const key = `${courseId}-${period}-${activate}`
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
                toast.success(activate ? "Radar activado" : "Radar desactivado")
            } else {
                toast.error(result.error ?? "Error al cambiar el estado")
            }
            setLoadingKey(null)
        })
    }

    const handleQuickActivate = (courseId: string) => {
        const used = new Set((sessionData[courseId] ?? []).map(s => s.period))
        const next = ALL_PERIODS.find(p => !used.has(p))
        if (!next) { toast.error("Este curso ya tiene todos los períodos registrados"); return }
        handleToggle(courseId, next, true)
    }

    const openModal = async (label: string, session: SessionInfo) => {
        if (!session.id) return
        setModal({ label, sessionId: session.id, activatedAt: session.activated_at, responseCount: session.response_count, avgByAxis: {}, loading: true })
        const result = await getRadarSessionSummary(session.id)
        if (result.success && result.data) {
            setModal(prev => prev ? { ...prev, avgByAxis: result.data!.avgByAxis, loading: false } : null)
        } else {
            setModal(prev => prev ? { ...prev, loading: false } : null)
        }
    }

    if (courses.length === 0) {
        return <p className="text-sm text-slate-400 text-center py-6">No hay cursos activos en tu institución.</p>
    }

    return (
        <>
            {/* Modal de detalle de sesión */}
            {modal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setModal(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                                    {modal.label}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">Resultados generales</span>
                            </div>
                            <button
                                onClick={() => setModal(null)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {/* Fecha y respuestas */}
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                    {new Date(modal.activatedAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    {modal.responseCount} respuesta{modal.responseCount !== 1 ? "s" : ""}
                                </div>
                            </div>

                            {/* Promedios por eje */}
                            {modal.loading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                                </div>
                            ) : modal.responseCount === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">Sin respuestas registradas aún.</p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Promedio por eje CASEL</p>
                                    {AXIS_ORDER.map(ax => {
                                        const avg = modal.avgByAxis[ax]
                                        if (avg === undefined) return null
                                        const meta = AXES_META[ax]
                                        return (
                                            <div key={ax} className="flex items-center gap-2">
                                                <span className="text-sm shrink-0">{meta.emoji}</span>
                                                <span className="text-[11px] text-slate-600 w-32 shrink-0">{meta.label}</span>
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{ width: `${(avg / 5) * 100}%`, backgroundColor: meta.color }}
                                                    />
                                                </div>
                                                <span className="text-xs font-extrabold w-8 text-right shrink-0" style={{ color: scoreColor(avg) }}>
                                                    {avg.toFixed(1)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Link a resultados completos */}
                            {modal.sessionId && (
                                <Link
                                    href={`/${role}/radar/resultados/${modal.sessionId}`}
                                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl transition-colors w-full"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Ver resultados completos
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabla */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-semibold">Curso</th>
                            <th className="px-3 py-2.5 text-left font-semibold hidden sm:table-cell">Aplicaciones</th>
                            <th className="px-3 py-2.5 text-center font-semibold">Activar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {courses.map(course => {
                            const sessions = sessionData[course.id] ?? []
                            // ordenar por fecha para numerarlas R1, R2, R3...
                            const sorted = [...sessions].sort(
                                (a, b) => new Date(a.activated_at).getTime() - new Date(b.activated_at).getTime()
                            )
                            const usedPeriods = new Set(sessions.map(s => s.period))
                            const allUsed = ALL_PERIODS.every(p => usedPeriods.has(p))
                            const nextPeriod = ALL_PERIODS.find(p => !usedPeriods.has(p))
                            const courseName = `${course.name}${course.section ? " " + course.section : ""}`
                            const isActivating = nextPeriod && loadingKey === `${course.id}-${nextPeriod}-true`

                            return (
                                <tr key={course.id} className="hover:bg-slate-50/40 transition-colors">
                                    {/* Nombre */}
                                    <td className="px-4 py-3 align-middle">
                                        <p className="font-semibold text-slate-800">{courseName}</p>
                                        {sorted.filter(s => s.active).length > 0 && (
                                            <span className="text-[10px] text-emerald-600 font-semibold">
                                                activo
                                            </span>
                                        )}
                                        {/* Pills visibles solo en mobile */}
                                        {sorted.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1.5 sm:hidden">
                                                {sorted.map((s, idx) => {
                                                    const label = `R${idx + 1}`
                                                    const toggleKey = `${course.id}-${s.period}-${!s.active}`
                                                    const isToggling = loadingKey === toggleKey
                                                    return (
                                                        <div key={s.period} className="flex items-center gap-0.5">
                                                            <button
                                                                onClick={() => openModal(label, s)}
                                                                disabled={!s.id}
                                                                className={`flex items-center gap-1 rounded-lg px-2 py-0.5 border text-[11px] font-bold transition-all ${
                                                                    s.active
                                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                                                                }`}
                                                            >
                                                                {s.active
                                                                    ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                    : <XCircle className="w-3 h-3 text-slate-300 shrink-0" />
                                                                }
                                                                {label}
                                                                <span className="text-[9px] font-normal text-slate-400">{s.response_count}r</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggle(course.id, s.period, !s.active)}
                                                                disabled={isToggling || isPending}
                                                                className={`text-[9px] font-bold px-1 py-0.5 rounded border transition-all disabled:opacity-40 ${
                                                                    s.active
                                                                        ? "text-rose-500 border-rose-200 hover:bg-rose-50"
                                                                        : "text-indigo-500 border-indigo-200 hover:bg-indigo-50"
                                                                }`}
                                                            >
                                                                {isToggling ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : s.active ? "✕" : "↺"}
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </td>

                                    {/* Pills R1, R2, R3 */}
                                    <td className="px-3 py-3 align-middle hidden sm:table-cell">
                                        {sorted.length === 0 ? (
                                            <span className="text-slate-300 italic">Sin aplicaciones</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {sorted.map((s, idx) => {
                                                    const label = `R${idx + 1}`
                                                    const toggleKey = `${course.id}-${s.period}-${!s.active}`
                                                    const isToggling = loadingKey === toggleKey
                                                    return (
                                                        <div key={s.period} className="flex items-center gap-1">
                                                            {/* Pill clickeable */}
                                                            <button
                                                                onClick={() => openModal(label, s)}
                                                                disabled={!s.id}
                                                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 border text-[11px] font-bold transition-all ${
                                                                    s.active
                                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                                                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 cursor-pointer"
                                                                }`}
                                                                title={`Ver detalles de ${label}`}
                                                            >
                                                                {s.active
                                                                    ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                    : <XCircle className="w-3 h-3 text-slate-300 shrink-0" />
                                                                }
                                                                {label}
                                                                <span className="text-[9px] font-normal text-slate-400">{s.response_count}r</span>
                                                            </button>
                                                            {/* Toggle desact./react. */}
                                                            <button
                                                                onClick={() => handleToggle(course.id, s.period, !s.active)}
                                                                disabled={isToggling || isPending}
                                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all disabled:opacity-40 ${
                                                                    s.active
                                                                        ? "text-rose-500 border-rose-200 hover:bg-rose-50"
                                                                        : "text-indigo-500 border-indigo-200 hover:bg-indigo-50"
                                                                }`}
                                                            >
                                                                {isToggling
                                                                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                                    : s.active ? "✕" : "↺"
                                                                }
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </td>

                                    {/* Botón activar */}
                                    <td className="px-3 py-3 align-middle text-center">
                                        {allUsed ? (
                                            <span className="text-[10px] text-slate-300 italic">Completo</span>
                                        ) : (
                                            <button
                                                onClick={() => handleQuickActivate(course.id)}
                                                disabled={!!isActivating || isPending}
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 shadow-sm"
                                            >
                                                {isActivating
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <Plus className="w-3 h-3" />
                                                }
                                                Activar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </>
    )
}
