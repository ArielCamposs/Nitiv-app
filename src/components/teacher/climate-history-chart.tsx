"use client"

import { useState, useMemo, useEffect } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Activity, CalendarDays, Trophy,
    Info, ChevronLeft, ChevronRight, User
} from "lucide-react"
import { Button } from "@/components/ui/button"

const ENERGY_COLORS: Record<string, string> = {
    regulada: "#10b981",
    inquieta: "#f59e0b",
    apatica: "#6366f1",
    explosiva: "#ef4444",
}

const ENERGY_DEFINITIONS: Record<string, { label: string, desc: string, emoji: string }> = {
    regulada: { label: "Regulada", desc: "Clima ideal para el aprendizaje. Estudiantes enfocados.", emoji: "😊" },
    inquieta: { label: "Inquieta", desc: "Nivel de ruido alto o falta de atención. Requiere pausa.", emoji: "😯" },
    apatica: { label: "Apática", desc: "Baja participación o desmotivación. Requiere energía.", emoji: "😐" },
    explosiva: { label: "Explosiva", desc: "Conflictos visibles o descontrol. Intervención inmediata.", emoji: "💥" },
}

const DAYS_OF_WEEK = [
    { name: "Lunes", key: 1 },
    { name: "Martes", key: 2 },
    { name: "Miércoles", key: 3 },
    { name: "Jueves", key: 4 },
    { name: "Viernes", key: 5 },
]

interface Props {
    courses: any[]
    historyLogs: any[]
    showFilters?: boolean
    teachers?: { id: string, name: string }[]
}

function getMonday(d: Date) {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
}

function formatDateToSQL(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function ClimateHistoryChart({ courses, historyLogs, showFilters, teachers }: Props) {
    const [mounted, setMounted] = useState(false)
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()))
    const [selectedCourse, setSelectedCourse] = useState<string>(() => {
        const firstWithLogs = courses.find(c => {
            const id = c.id || c.course_id
            return historyLogs.some(l => l.course_id === id)
        })
        const fallback = courses[0]?.id || courses[0]?.course_id || "all"
        return firstWithLogs?.id || firstWithLogs?.course_id || fallback
    })

    useEffect(() => {
        setMounted(true)
    }, [])

    // Robust synchronization: if courses changes (e.g. parent filtered), update selection
    useEffect(() => {
        if (courses.length > 0 && selectedCourse === "all") {
            const firstWithLogs = courses.find(c => {
                const id = c.id || c.course_id
                return historyLogs.some(l => l.course_id === id)
            })
            const firstId = firstWithLogs?.id || firstWithLogs?.course_id
                || courses[0]?.id || courses[0]?.course_id
            if (firstId) setSelectedCourse(firstId)
        }
    }, [courses])

    // Filter logs for the current week and selected course
    const weekLogs = useMemo(() => {
        if (selectedCourse === "all") return []

        const weekEnd = new Date(currentWeekStart)
        weekEnd.setDate(currentWeekStart.getDate() + 4) // Inclusive of Friday only
        weekEnd.setHours(23, 59, 59, 999)

        return historyLogs.filter(l => {
            // Ensure l.log_date is treated as a local date string
            const logDate = new Date(l.log_date + "T12:00:00")
            return (l.course_id === selectedCourse) &&
                   (logDate >= currentWeekStart) && 
                   (logDate <= weekEnd)
        })
    }, [historyLogs, selectedCourse, currentWeekStart])

    // Summary stats for the view
    const stats = useMemo(() => {
        if (weekLogs.length === 0) return null
        const total = weekLogs.length
        const freqMap: Record<string, number> = {}
        weekLogs.forEach(l => { freqMap[l.energy_level] = (freqMap[l.energy_level] ?? 0) + 1 })
        const mostFrequent = Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0][0]
        
        // Find most active teacher in this course this week
        const teacherMap: Record<string, number> = {}
        weekLogs.forEach(l => { if(l.teacher_id) teacherMap[l.teacher_id] = (teacherMap[l.teacher_id] ?? 0) + 1 })
        const topTeacherId = Object.entries(teacherMap).sort((a, b) => b[1] - a[1])[0]?.[0]
        const topTeacher = teachers?.find(t => t.id === topTeacherId)?.name ?? "Docente"

        return { total, mostFrequent, topTeacher }
    }, [weekLogs, teachers])

    const changeWeek = (offset: number) => {
        const next = new Date(currentWeekStart)
        next.setDate(currentWeekStart.getDate() + (offset * 7))
        setCurrentWeekStart(next)
    }

    const weekRangeLabel = useMemo(() => {
        const end = new Date(currentWeekStart)
        end.setDate(currentWeekStart.getDate() + 4)
        return `${currentWeekStart.toLocaleDateString("es-CL", { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString("es-CL", { day: 'numeric', month: 'short' })}`
    }, [currentWeekStart])

    const isCurrentWeek = useMemo(() => {
        const todayWeekStart = getMonday(new Date())
        return todayWeekStart.getTime() === currentWeekStart.getTime()
    }, [currentWeekStart])

    const goToToday = () => setCurrentWeekStart(getMonday(new Date()))

    // Map logs to Day and Block for easy grid rendering
    const gridData = useMemo(() => {
        const map: Record<string, any> = {}
        weekLogs.forEach(log => {
            const date = log.log_date
            const block = log.block_number
            if (block) {
                map[`${date}-${block}`] = log
            }
        })
        return map
    }, [weekLogs])

    return (
        <div className="bg-white rounded-2xl border p-5 space-y-8">
            {/* Header + Selector de Curso y Semana */}
            <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-indigo-500" />
                        Calendario Semanal de Clima
                    </h2>
                    <p className="text-sm text-slate-500 max-w-md">
                        Distribución horaria por bloque. ({historyLogs.length} registros totales)
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Filtro de Curso - Requerido para el Calendario */}
                    <div className="flex items-center gap-1 bg-slate-50 border rounded-lg p-1">
                        {mounted ? (
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger className="w-[180px] h-9 text-xs border-0 bg-transparent focus:ring-0 font-bold">
                                    <SelectValue placeholder="Seleccionar Curso" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map(c => {
                                        const id = c.id || c.course_id
                                        const name = c.name || c.courses?.name
                                        return (
                                            <SelectItem key={id} value={id}>
                                                {name}
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="w-[180px] h-9" />
                        )}
                    </div>

                    {/* Navegación Semanal */}
                    <div className="flex items-center gap-2 bg-slate-50 border rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeWeek(-1)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-[11px] font-bold text-slate-600 min-w-[120px] text-center">
                            Semana: {mounted ? weekRangeLabel : "..."}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeWeek(1)}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={isCurrentWeek ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 px-2 text-[11px] font-bold shrink-0"
                            onClick={goToToday}
                        >
                            Hoy
                        </Button>
                    </div>
                </div>
            </div>

            {selectedCourse === "all" ? (
                <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 gap-3">
                    <span className="text-5xl">👈</span>
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-600">Selecciona un curso</p>
                        <p className="text-xs">Para visualizar el calendario semanal debes filtrar por un curso específico.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* DASHBOARD SUPERIOR: Estadísticas + Leyenda + Ayuda */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                        {/* 1. Estadísticas Clave */}
                        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-2xl bg-linear-to-br from-slate-50 to-white border border-slate-100 shadow-xs">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registros</p>
                                <p className="text-xl font-black text-slate-700">{stats?.total ?? 0}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-linear-to-br from-emerald-50 to-white border border-emerald-100 shadow-xs text-emerald-900">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Más Activo</p>
                                <p className="text-xs font-bold truncate">{stats?.topTeacher?.split(' ')[0] ?? "N/A"}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-linear-to-br from-indigo-50 to-white border border-indigo-100 shadow-xs text-indigo-900 col-span-2 sm:col-span-1">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Predominante</p>
                                <p className="text-xs font-bold truncate">
                                    {stats ? `${ENERGY_DEFINITIONS[stats.mostFrequent]?.label}` : "N/A"}
                                </p>
                            </div>
                        </div>

                        {/* 2. Leyenda Compacta */}
                        <div className="lg:col-span-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(ENERGY_DEFINITIONS).map(([key, def]) => (
                                    <div key={key} className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ENERGY_COLORS[key] }} />
                                        <span className="text-[9px] font-bold text-slate-600 truncate">{def.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Tips de Funcionamiento */}
                        <div className="lg:col-span-3 p-3 rounded-2xl bg-amber-50/50 border border-amber-100/50 flex flex-col justify-center">
                            <div className="flex items-start gap-2">
                                <Info className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-wider">Ayuda</p>
                                    <p className="text-[9px] text-amber-800 leading-tight">Muestra registros de todos los docentes del curso por bloque (1-12).</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* El Calendario Grid */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                        <div className="min-w-[800px] bg-white">
                            {/* Días del Calendario (Header del Grid) */}
                            <div className="grid grid-cols-[100px_repeat(5,1fr)] bg-slate-50 border-b border-slate-200">
                                <div className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 flex items-center justify-center">
                                    Bloques
                                </div>
                                {DAYS_OF_WEEK.map((day) => {
                                    const date = new Date(currentWeekStart)
                                    date.setDate(currentWeekStart.getDate() + day.key - 1)
                                    const formatted = date.toLocaleDateString("es-CL", { day: 'numeric', month: 'short' })
                                    return (
                                        <div key={day.key} className="p-4 text-center border-r border-slate-200 last:border-r-0">
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-wider">{day.name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{formatted}</p>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Filas de Bloques (1 al 12) */}
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((blockNum) => (
                                <div key={blockNum} className="grid grid-cols-[100px_repeat(5,1fr)] border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    {/* Etiqueta del Bloque */}
                                    <div className="p-4 flex flex-col items-center justify-center border-r border-slate-200 bg-slate-50/30">
                                        <span className="text-xs font-black text-slate-700">{blockNum}°</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Bloque</span>
                                    </div>

                                    {/* Celdas por Día */}
                                    {DAYS_OF_WEEK.map((day) => {
                                        const d = new Date(currentWeekStart)
                                        d.setDate(currentWeekStart.getDate() + day.key - 1)
                                        const dateKey = formatDateToSQL(d)
                                        const log = gridData[`${dateKey}-${blockNum}`]
                                        const teacherName = teachers?.find(t => t.id === log?.teacher_id)?.name ?? "Docente"

                                        return (
                                            <div key={day.key} className="p-2 border-r border-slate-100 last:border-r-0 min-h-[80px] flex items-stretch">
                                                {log ? (
                                                    <div 
                                                        className="w-full rounded-xl p-2.5 flex flex-col justify-between shadow-sm border animate-in fade-in duration-500"
                                                        style={{ 
                                                            backgroundColor: `${ENERGY_COLORS[log.energy_level]}10`,
                                                            borderColor: `${ENERGY_COLORS[log.energy_level]}30`
                                                        }}
                                                    >
                                                            <div className="flex items-center gap-1">
                                                                <User className="w-2.5 h-2.5 text-slate-400" />
                                                                <span className="text-[9px] font-bold leading-none text-slate-800 truncate max-w-[60px]">
                                                                    {teacherName.split(' ')[0]} {teacherName.split(' ')[1]?.[0] + '.'}
                                                                </span>
                                                                {log.session_time && (
                                                                    <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1 rounded-sm">
                                                                        {log.session_time === 'morning' ? 'M' : 'T'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs">{ENERGY_DEFINITIONS[log.energy_level]?.emoji}</span>
                                                        <div 
                                                            className="mt-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest w-fit"
                                                            style={{ 
                                                                backgroundColor: ENERGY_COLORS[log.energy_level],
                                                                color: 'white'
                                                            }}
                                                        >
                                                            {ENERGY_DEFINITIONS[log.energy_level]?.label ?? log.energy_level}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full rounded-xl border border-dashed border-slate-100 flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
