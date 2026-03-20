"use client"

import { useEffect, useRef, useState } from "react"
import { NuevoCasoDialog } from "./nuevo-caso-dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
    CASE_STATUS_PENDING_KEY,
    readPendingCaseStatuses,
    rememberPendingCaseStatus,
} from "@/lib/case-status-pending"
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

const CASES_PAGE_SIZE = 10

function courseLabelFromStudent(s: Student | null | undefined): string {
    if (!s?.courses?.name) return ""
    const sec = s.courses?.section
    return `${s.courses.name}${sec ? ` ${sec}` : ""}`.trim()
}

export function CasosPageContent({ casos, students, professionals, institutionId, userId, userRole, userName }: Props) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [viewTab, setViewTab] = useState<"activos" | "cerrados">("activos")
    const [filterCourse, setFilterCourse] = useState<string>("")
    const [filterStudentId, setFilterStudentId] = useState<string>("")
    const [casesPage, setCasesPage] = useState(1)
    /** Evita mismatch de hidratación: Radix Select genera aria-controls distintos en SSR vs cliente. */
    const [filtersMounted, setFiltersMounted] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isDocente = userRole === "docente"

    const [localCasos, setLocalCasos] = useState<Caso[]>(casos)

    const normalize = (value: string | null | undefined) =>
        (value ?? "")
            .toString()
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\s-]+/g, "_")

    const isClosed = (status: string | null | undefined) => {
        const normalized = normalize(status)
        return normalized === "cerrado" || normalized === "closed" || normalized === "resuelto"
    }

    const statusIn = (status: string | null | undefined, allowed: string[]) =>
        allowed.includes(normalize(status))

    const activeCases = localCasos.filter((c) => !isClosed(c.status))
    const closedCases = localCasos.filter((c) => isClosed(c.status))
    const closedCount = closedCases.length
    const baseByTab = viewTab === "activos" ? activeCases : closedCases

    const courseOptions = Array.from(
        new Set(
            students
                .map((s) => courseLabelFromStudent(s))
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b, "es"))

    const studentsForFilter = filterCourse
        ? students.filter((s) => courseLabelFromStudent(s) === filterCourse)
        : students

    const casesToShow = baseByTab.filter((c) => {
        if (filterCourse) {
            const label = courseLabelFromStudent(c.students)
            if (label !== filterCourse) return false
        }
        if (filterStudentId && c.student_id !== filterStudentId) return false
        return true
    })

    const hasActiveFilters = Boolean(filterCourse || filterStudentId)

    const casesTotalFiltered = casesToShow.length
    const casesTotalPages = casesTotalFiltered === 0 ? 0 : Math.ceil(casesTotalFiltered / CASES_PAGE_SIZE)
    const casesSafePage =
        casesTotalPages === 0 ? 1 : Math.min(Math.max(1, casesPage), casesTotalPages)
    const casesPageStart = (casesSafePage - 1) * CASES_PAGE_SIZE
    const paginatedCases = casesToShow.slice(casesPageStart, casesPageStart + CASES_PAGE_SIZE)

    useEffect(() => {
        setFiltersMounted(true)
    }, [])

    // Sincroniza con el servidor y aplica cierres pendientes (vuelta desde detalle / caché RSC).
    useEffect(() => {
        const pending = readPendingCaseStatuses()
        const cleaned: Record<string, string> = { ...pending }
        for (const c of casos) {
            if (cleaned[c.id] === "cerrado" && isClosed(c.status)) {
                delete cleaned[c.id]
            }
        }
        try {
            if (JSON.stringify(cleaned) !== JSON.stringify(pending)) {
                sessionStorage.setItem(CASE_STATUS_PENDING_KEY, JSON.stringify(cleaned))
            }
        } catch {
            /* ignore */
        }
        setLocalCasos(
            casos.map((c) => (cleaned[c.id] ? { ...c, status: cleaned[c.id] } : c))
        )
    }, [casos])

    useEffect(() => {
        const onClosed = (e: Event) => {
            const d = (e as CustomEvent<{ caseId: string }>).detail
            if (!d?.caseId) return
            rememberPendingCaseStatus(d.caseId, "cerrado")
            setLocalCasos((prev) =>
                prev.map((c) => (c.id === d.caseId ? { ...c, status: "cerrado" } : c))
            )
        }
        window.addEventListener("student-case-closed", onClosed)
        return () => window.removeEventListener("student-case-closed", onClosed)
    }, [])

    useEffect(() => {
        setCasesPage(1)
    }, [viewTab, filterCourse, filterStudentId])

    useEffect(() => {
        if (casesTotalPages > 0 && casesPage > casesTotalPages) {
            setCasesPage(casesTotalPages)
        }
    }, [casesTotalPages, casesPage])

    // Contadores (robustos ante variaciones de formato en estado/urgencia)
    const urgentes = localCasos.filter(
        (c) => statusIn(c.initial_state, ["urgente", "alta"]) && !isClosed(c.status)
    ).length
    const enSeguimiento = localCasos.filter((c) =>
        statusIn(c.status, ["en_proceso", "atendido", "en_seguimiento", "seguimiento"])
    ).length
    const sinAsignar = localCasos.filter((c) => !c.responsable_id && !isClosed(c.status)).length
    const totales = activeCases.length

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

    useEffect(() => {
        const scheduleRefresh = () => {
            // Debounce simple para agrupar múltiples eventos seguidos
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
            refreshTimerRef.current = setTimeout(() => {
                router.refresh()
            }, 250)
        }

        const channel = supabase
            .channel(`monitoreo-cases-${institutionId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "student_cases", filter: `institution_id=eq.${institutionId}` },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "student_case_actions" },
                scheduleRefresh
            )
            .subscribe()

        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
            supabase.removeChannel(channel)
        }
    }, [supabase, router, institutionId])

    useEffect(() => {
        // Fallback cuando Realtime no está habilitado/configurado en el proyecto.
        // Refresca en segundo plano mientras la pestaña está visible.
        const intervalId = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
                router.refresh()
            }
        }, 5000)

        return () => clearInterval(intervalId)
    }, [router])

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de casos</h1>
                    <p className="text-slate-500 mt-1">
                        {isDocente ? "Mis derivaciones enviadas al equipo." : "Bandeja de convivencia y dupla psicosocial."}
                    </p>
                </div>
                {isDocente && (
                    <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Abrir nuevo caso
                    </Button>
                )}
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
                <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-white">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="inline-flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 w-fit">
                            {[
                                { value: "activos" as const, label: `Activos (${activeCases.length})`, activeClass: "bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200 border-emerald-500" },
                                { value: "cerrados" as const, label: `Cerrados (${closedCases.length})`, activeClass: "bg-slate-700 text-white shadow-md ring-2 ring-slate-300 border-slate-700" },
                            ].map(tab => (
                                <button
                                    type="button"
                                    key={tab.value}
                                    onClick={() => setViewTab(tab.value)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                        viewTab === tab.value
                                            ? tab.activeClass
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 min-w-0 flex-1 lg:max-w-xl lg:justify-end">
                            <div className="flex flex-col gap-1 min-w-0 sm:min-w-[160px] sm:flex-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Curso</span>
                                {!filtersMounted ? (
                                    <div className="h-9 w-full rounded-md border border-slate-200 bg-slate-100/80 animate-pulse" aria-hidden />
                                ) : (
                                    <Select
                                        value={filterCourse || "__all__"}
                                        onValueChange={(v) => {
                                            const next = v === "__all__" ? "" : v
                                            setFilterCourse(next)
                                            setFilterStudentId("")
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-sm bg-white">
                                            <SelectValue placeholder="Todos los cursos" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value="__all__">Todos los cursos</SelectItem>
                                            {courseOptions.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="flex flex-col gap-1 min-w-0 sm:min-w-[200px] sm:flex-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estudiante</span>
                                {!filtersMounted ? (
                                    <div className="h-9 w-full rounded-md border border-slate-200 bg-slate-100/80 animate-pulse" aria-hidden />
                                ) : (
                                    <Select
                                        value={filterStudentId || "__all__"}
                                        onValueChange={(v) => setFilterStudentId(v === "__all__" ? "" : v)}
                                        disabled={studentsForFilter.length === 0}
                                    >
                                        <SelectTrigger className="h-9 text-sm bg-white">
                                            <SelectValue placeholder="Todos los estudiantes" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value="__all__">Todos los estudiantes</SelectItem>
                                            {studentsForFilter
                                                .slice()
                                                .sort((a, b) =>
                                                    `${a.last_name} ${a.name}`.localeCompare(`${b.last_name} ${b.name}`, "es")
                                                )
                                                .map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.last_name}, {s.name}
                                                        {!filterCourse && courseLabelFromStudent(s) ? ` — ${courseLabelFromStudent(s)}` : ""}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-500 shrink-0 h-9 self-end sm:self-end"
                                    onClick={() => {
                                        setFilterCourse("")
                                        setFilterStudentId("")
                                    }}
                                >
                                    Limpiar filtros
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50/30">
                <div className="p-4 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {casesToShow.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            {hasActiveFilters ? (
                                <>
                                    <p>No hay casos que coincidan con los filtros.</p>
                                    <p className="mt-2 text-xs text-slate-400">Prueba con otro curso o estudiante, o limpia los filtros.</p>
                                </>
                            ) : viewTab === "activos" ? (
                                "No hay casos activos en la bandeja."
                            ) : (
                                "No hay casos cerrados."
                            )}
                            {!hasActiveFilters && viewTab === "activos" && closedCount > 0 && (
                                <p className="mt-2 text-xs text-slate-400">
                                    Hay {closedCount} caso(s) cerrado(s).
                                </p>
                            )}
                        </div>
                    ) : (
                        paginatedCases.map((caso) => {
                            const caseIsClosed = isClosed(caso.status)
                            return (
                            <div key={caso.id} className="relative bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all shadow-sm">
                                
                                {/* Badge Superior Derecha */}
                                <div className="absolute top-5 right-5 hidden md:block">
                                    {caseIsClosed ? (
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                            Cerrado
                                        </span>
                                    ) : (
                                        getUrgencyBadge(caso.initial_state, caso.responsable)
                                    )}
                                </div>

                                {/* Información Principal — nombre + curso + derivación + tiempo en una sola fila (wrap en móvil) */}
                                <div className="pr-0 md:pr-48">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <h3 className="font-bold text-lg text-slate-900 shrink-0">
                                            {caso.students?.name ?? "Estudiante"} {caso.students?.last_name ?? ""}
                                        </h3>
                                        <span className="hidden sm:inline text-slate-300 select-none" aria-hidden>·</span>
                                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                                            {caso.students?.courses?.name ?? "Sin curso"} {caso.students?.courses?.section ?? ""}
                                        </span>
                                        <span className="text-slate-300 select-none" aria-hidden>·</span>
                                        <span className="text-xs text-slate-500">
                                            Derivado por Prof. {caso.creador?.last_name}
                                        </span>
                                        <span className="text-slate-300 select-none" aria-hidden>·</span>
                                        <span className="text-xs text-slate-500">
                                            Hace {formatDistanceToNow(new Date(caso.created_at), { locale: es })}
                                        </span>
                                    </div>

                                    {/* Mobile Badge */}
                                    <div className="mt-2 block md:hidden">
                                        {caseIsClosed ? (
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                Cerrado
                                            </span>
                                        ) : (
                                            getUrgencyBadge(caso.initial_state, caso.responsable)
                                        )}
                                    </div>

                                    {/* Chips de Motivo (Truncated for design) */}
                                    <div className="mt-3 text-sm text-slate-700 leading-relaxed">
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
                                        <Link 
                                            href={`/monitoreo/${caso.id}`}
                                            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
                                        >
                                            Ver caso <span aria-hidden="true">&rarr;</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )})
                    )}
                </div>

                {casesTotalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3 border-t border-slate-200 bg-white">
                        <p className="text-xs text-slate-500 order-2 sm:order-1">
                            Mostrando{" "}
                            <span className="font-semibold text-slate-700">
                                {casesPageStart + 1}–{Math.min(casesPageStart + CASES_PAGE_SIZE, casesTotalFiltered)}
                            </span>{" "}
                            de <span className="font-semibold text-slate-700">{casesTotalFiltered}</span> casos
                        </p>
                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2"
                                disabled={casesSafePage <= 1}
                                onClick={() => setCasesPage((p) => Math.max(1, p - 1))}
                                aria-label="Página anterior"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-medium text-slate-600 tabular-nums min-w-[5.5rem] text-center">
                                Pág. {casesSafePage} / {casesTotalPages}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2"
                                disabled={casesSafePage >= casesTotalPages}
                                onClick={() => setCasesPage((p) => Math.min(casesTotalPages, p + 1))}
                                aria-label="Página siguiente"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {isDocente && (
                <NuevoCasoDialog 
                    isOpen={isDialogOpen} 
                    onClose={() => setIsDialogOpen(false)} 
                    students={students}
                    userId={userId}
                    institutionId={institutionId}
                    userName={userName}
                />
            )}
        </div>
    )
}
