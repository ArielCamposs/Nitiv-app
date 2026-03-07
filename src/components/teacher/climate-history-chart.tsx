"use client"

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts"
import { useState, useMemo } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Filter, Activity, CalendarDays, BarChart3, Trophy,
    AlertTriangle, CheckCircle2, XCircle
} from "lucide-react"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

const ENERGY_LABEL: Record<number, string> = {
    1: "Explosiva", 2: "Apática", 3: "Inquieta", 4: "Regulada",
}

const ENERGY_LABEL_TEXT: Record<string, string> = {
    explosiva: "Explosiva",
    apatica: "Apática",
    inquieta: "Inquieta",
    regulada: "Regulada",
}

const COURSE_COLORS = [
    "#6366f1", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#06b6d4", "#ec4899",
]

const RANGES = [
    { label: "30 días", value: 30 },
    { label: "60 días", value: 60 },
    { label: "90 días", value: 90 },
]

interface Props {
    courses: any[]
    historyLogs: any[]
    showFilters?: boolean
    teachers?: { id: string, name: string }[]
}

type GroupBy = "course" | "teacher"

function buildChartData(courses: any[], teachers: { id: string, name: string }[], logs: any[], days: number, groupBy: GroupBy) {
    if (logs.length === 0) return []

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const filtered = logs.filter(
        (l) => new Date(l.log_date + "T12:00:00") >= cutoff
    )

    const weekMap: Record<string, Record<string, number[]>> = {}

    filtered.forEach((log) => {
        const date = new Date(log.log_date + "T12:00:00")
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date.setDate(diff))
        const weekKey = monday.toISOString().split("T")[0]

        if (!weekMap[weekKey]) weekMap[weekKey] = {}
        const key = groupBy === "course" ? log.course_id : log.teacher_id
        if (!key) return

        if (!weekMap[weekKey][key]) weekMap[weekKey][key] = []
        weekMap[weekKey][key].push(ENERGY_SCORE[log.energy_level] ?? 3)
    })

    return Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, groupLogs]) => {
            const point: Record<string, any> = {
                semana: new Date(week + "T12:00:00").toLocaleDateString("es-CL", {
                    day: "numeric", month: "short",
                }),
            }
            if (groupBy === "course") {
                courses.forEach((c) => {
                    const vals = groupLogs[c.course_id]
                    point[c.course_id] = vals
                        ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2))
                        : null
                })
            } else {
                teachers.forEach((t) => {
                    const vals = groupLogs[t.id]
                    point[t.id] = vals
                        ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2))
                        : null
                })
            }
            return point
        })
}

function buildSummary(courses: any[], teachers: { id: string, name: string }[], logs: any[], days: number, groupBy: GroupBy) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const filtered = logs.filter(
        (l) => new Date(l.log_date + "T12:00:00") >= cutoff
    )

    if (filtered.length === 0) return null

    let averages: { name: string, avg: number | null, count: number }[] = []

    if (groupBy === "course") {
        averages = courses.map((c) => {
            const courseLogs = filtered.filter((l) => l.course_id === c.course_id)
            if (courseLogs.length === 0) return { name: c.courses?.name ?? "?", avg: null, count: 0 }
            const avg = courseLogs.reduce((a: number, l: any) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / courseLogs.length
            return { name: c.courses?.name ?? "?", avg, count: courseLogs.length }
        }).filter((c) => c.avg !== null)
    } else {
        averages = teachers.map((t) => {
            const teacherLogs = filtered.filter((l) => l.teacher_id === t.id)
            if (teacherLogs.length === 0) return { name: t.name, avg: null, count: 0 }
            const avg = teacherLogs.reduce((a: number, l: any) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / teacherLogs.length
            return { name: t.name, avg, count: teacherLogs.length }
        }).filter((t) => t.avg !== null)
    }

    if (averages.length === 0) return null

    const best = [...averages].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0]
    const worst = [...averages].sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))[0]
    const total = filtered.length

    const freqMap: Record<string, number> = {}
    filtered.forEach((l: any) => { freqMap[l.energy_level] = (freqMap[l.energy_level] ?? 0) + 1 })
    const mostFrequent = Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0][0]

    return { best, worst, total, mostFrequent, count: averages.length, groupBy }
}

function buildEnergyDistribution(logs: any[]) {
    if (logs.length === 0) return null
    const counts = { explosiva: 0, apatica: 0, inquieta: 0, regulada: 0 }
    logs.forEach(l => {
        const level = l.energy_level as keyof typeof counts
        if (counts[level] !== undefined) counts[level]++
    })
    return { ...counts, total: logs.length }
}

function buildDayOfWeekHeatmap(logs: any[]) {
    const map = [
        { name: "Lun", total: 0, count: 0 },
        { name: "Mar", total: 0, count: 0 },
        { name: "Mié", total: 0, count: 0 },
        { name: "Jue", total: 0, count: 0 },
        { name: "Vie", total: 0, count: 0 },
    ]
    logs.forEach(l => {
        const d = new Date(l.log_date + "T12:00:00").getDay()
        if (d >= 1 && d <= 5) {
            map[d - 1].total += (ENERGY_SCORE[l.energy_level] ?? 3)
            map[d - 1].count++
        }
    })
    return map.map(d => ({
        name: d.name,
        avg: d.count > 0 ? Math.round(d.total / d.count) : null
    }))
}

function buildTeacherRanking(logs: any[], teachers?: { id: string, name: string }[]) {
    if (!teachers || teachers.length === 0) return []
    const counts: Record<string, number> = {}
    logs.forEach(l => {
        if (l.teacher_id) {
            counts[l.teacher_id] = (counts[l.teacher_id] || 0) + 1
        }
    })
    return Object.entries(counts)
        .map(([id, count]) => {
            const t = teachers.find(t => t.id === id)
            return { name: t?.name ?? "Desconocido", count }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
}

function buildCriticalDays(logs: any[]) {
    if (logs.length === 0) return null
    const dayMap: Record<string, { total: number, count: number }> = {}
    logs.forEach(l => {
        if (!dayMap[l.log_date]) dayMap[l.log_date] = { total: 0, count: 0 }
        dayMap[l.log_date].total += (ENERGY_SCORE[l.energy_level] ?? 3)
        dayMap[l.log_date].count++
    })

    const dailyAverages = Object.entries(dayMap).map(([date, d]) => ({
        date,
        dateFormatted: new Date(date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
        avg: d.total / d.count
    }))

    if (dailyAverages.length === 0) return null

    const sorted = [...dailyAverages].sort((a, b) => b.avg - a.avg)
    return {
        best: sorted[0],
        worst: sorted[sorted.length - 1]
    }
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm space-y-1 min-w-[160px]">
            <p className="font-semibold text-slate-700 mb-2">Semana del {label}</p>
            {payload.map((entry: any) => (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                        <span className="text-slate-600 truncate max-w-[100px]">{entry.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: entry.color }}>
                        {entry.value !== null
                            ? ENERGY_LABEL[Math.round(entry.value)] ?? entry.value
                            : "—"}
                    </span>
                </div>
            ))}
        </div>
    )
}

export function ClimateHistoryChart({ courses, historyLogs, showFilters, teachers }: Props) {
    const [days, setDays] = useState(30)
    const [selectedCourse, setSelectedCourse] = useState<string>("all")
    const [selectedTeacher, setSelectedTeacher] = useState<string>("all")

    const filteredLogs = useMemo(() => {
        let logs = historyLogs
        if (selectedCourse !== "all") {
            logs = logs.filter(l => l.course_id === selectedCourse)
        }
        if (selectedTeacher !== "all") {
            logs = logs.filter(l => l.teacher_id === selectedTeacher)
        }
        return logs
    }, [historyLogs, selectedCourse, selectedTeacher])

    const filteredCourses = useMemo(() => {
        let result = courses
        if (selectedCourse !== "all") {
            result = result.filter(c => c.course_id === selectedCourse)
        }
        if (selectedTeacher !== "all") {
            const activeCourseIds = new Set(filteredLogs.map(l => l.course_id))
            result = result.filter(c => activeCourseIds.has(c.course_id))
        }
        return result
    }, [courses, selectedCourse, selectedTeacher, filteredLogs])

    const filteredTeachers = useMemo(() => {
        if (!teachers) return []
        let result = teachers
        if (selectedTeacher !== "all") {
            result = result.filter(t => t.id === selectedTeacher)
        }
        if (selectedCourse !== "all") {
            // Un componente o director puede no tener acceso a la vista de los profesores de ese curso
            const activeTeacherIds = new Set(filteredLogs.map(l => l.teacher_id))
            result = result.filter(t => activeTeacherIds.has(t.id))
        }
        return result
    }, [teachers, selectedCourse, selectedTeacher, filteredLogs])

    const groupBy: GroupBy = selectedCourse !== "all" && selectedTeacher === "all" ? "teacher" : "course"

    const chartData = useMemo(
        () => buildChartData(filteredCourses, filteredTeachers, filteredLogs, days, groupBy),
        [filteredCourses, filteredTeachers, filteredLogs, days, groupBy]
    )

    const isEmpty = chartData.length === 0

    return (
        <div className="bg-white rounded-2xl border p-5 space-y-4">

            {/* Header + selector de rango */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Evolución del clima por curso
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Energía promedio semanal
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Filtros */}
                    {showFilters && (
                        <div className="flex items-center gap-2">
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger className="w-[200px] h-8 text-xs bg-white">
                                    <SelectValue placeholder="Todos los cursos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los cursos</SelectItem>
                                    {courses.map(c => (
                                        <SelectItem key={c.course_id} value={c.course_id}>
                                            {c.courses?.name ?? c.course_id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                <SelectTrigger className="w-[200px] h-8 text-xs bg-white">
                                    <SelectValue placeholder="Todos los docentes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los docentes</SelectItem>
                                    {teachers?.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Selector 30 / 60 / 90 días */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                        {RANGES.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => setDays(r.value)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${days === r.value
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* {Selector de curso removido - Ahora se maneja a nivel global en la cabecera) */}

            {/* Gráfico o estado vacío */}
            {isEmpty ? (
                <div className="flex flex-col items-center justify-center h-52 text-slate-400 gap-3">
                    <span className="text-5xl">📭</span>
                    <p className="text-sm">Sin registros en los últimos {days} días</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            {groupBy === "course" ? filteredCourses.map((c) => {
                                const originalIndex = courses.findIndex(oc => oc.course_id === c.course_id)
                                const color = COURSE_COLORS[originalIndex % COURSE_COLORS.length]
                                return (
                                    <linearGradient key={c.course_id} id={`grad-${c.course_id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                )
                            }) : filteredTeachers.map((t) => {
                                const originalIndex = teachers?.findIndex(ot => ot.id === t.id) ?? 0
                                const color = COURSE_COLORS[originalIndex % COURSE_COLORS.length]
                                return (
                                    <linearGradient key={t.id} id={`grad-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                )
                            })}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="semana"
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[1, 4]}
                            ticks={[1, 2, 3, 4]}
                            tickFormatter={(v) => ENERGY_LABEL[v]?.slice(0, 3) ?? v}
                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {groupBy === "course" ? filteredCourses.map((c) => {
                            const originalIndex = courses.findIndex(oc => oc.course_id === c.course_id)
                            const color = COURSE_COLORS[originalIndex % COURSE_COLORS.length]
                            const name = c.courses?.name ?? c.course_id
                            return (
                                <Area
                                    key={c.course_id}
                                    type="monotone"
                                    dataKey={c.course_id}
                                    name={name}
                                    stroke={color}
                                    strokeWidth={2.5}
                                    fill={`url(#grad-${c.course_id})`}
                                    fillOpacity={1}
                                    dot={{ r: 3, fill: color }}
                                    activeDot={{ r: 5 }}
                                    connectNulls
                                    opacity={1}
                                    isAnimationActive={false}
                                />
                            )
                        }) : filteredTeachers.map((t) => {
                            const originalIndex = teachers?.findIndex(ot => ot.id === t.id) ?? 0
                            const color = COURSE_COLORS[originalIndex % COURSE_COLORS.length]
                            return (
                                <Area
                                    key={t.id}
                                    type="monotone"
                                    dataKey={t.id}
                                    name={t.name}
                                    stroke={color}
                                    strokeWidth={2.5}
                                    fill={`url(#grad-${t.id})`}
                                    fillOpacity={1}
                                    dot={{ r: 3, fill: color }}
                                    activeDot={{ r: 5 }}
                                    connectNulls
                                    opacity={1}
                                    isAnimationActive={false}
                                />
                            )
                        })}
                    </AreaChart>
                </ResponsiveContainer>
            )}

            {/* Leyenda */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
                {[
                    { label: "Regulada", color: "#10b981" },
                    { label: "Inquieta", color: "#f59e0b" },
                    { label: "Apática", color: "#6366f1" },
                    { label: "Explosiva", color: "#ef4444" },
                ].map((e) => (
                    <div key={e.label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                        <span className="text-xs text-slate-400">{e.label}</span>
                    </div>
                ))}
            </div>

            {/* Resumen textual */}
            {!isEmpty && (() => {
                const summary = buildSummary(filteredCourses, filteredTeachers, filteredLogs, days, groupBy)
                if (!summary) return null
                const mostFreqLabel = ENERGY_LABEL_TEXT[summary.mostFrequent] ?? summary.mostFrequent
                const bestTitle = summary.groupBy === "course" ? "Tu curso más estable fue" : "El docente que calificó más alto fue"
                const worstTitle = summary.groupBy === "course" ? "El curso con mayor desafío fue" : "El docente que calificó más bajo fue"
                return (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm text-slate-600">
                        <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                            Resumen del período
                        </p>
                        <ul className="space-y-1.5">
                            <li className="flex items-start gap-2">
                                <span>📋</span>
                                <span>
                                    Hubieron <strong>{summary.total}</strong> registros en los últimos{" "}
                                    <strong>{days} días</strong>.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span>📈</span>
                                <span>
                                    El clima predominante fue{" "}
                                    <strong>{mostFreqLabel}</strong>.
                                </span>
                            </li>
                            {summary.count > 1 && (
                                <>
                                    <li className="flex items-start gap-2">
                                        <span>✅</span>
                                        <span>
                                            {bestTitle}{" "}
                                            <strong>{summary.best.name}</strong>{" "}
                                            <span className="text-slate-400">
                                                (promedio {ENERGY_LABEL[Math.round(summary.best.avg ?? 0)]})
                                            </span>.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>⚠️</span>
                                        <span>
                                            {worstTitle}{" "}
                                            <strong>{summary.worst.name}</strong>{" "}
                                            <span className="text-slate-400">
                                                (promedio {ENERGY_LABEL[Math.round(summary.worst.avg ?? 0)]})
                                            </span>.
                                        </span>
                                    </li>
                                </>
                            )}
                            {summary.count === 1 && (
                                <li className="flex items-start gap-2">
                                    <span>✅</span>
                                    <span>
                                        Promedio general:{" "}
                                        <strong>
                                            {ENERGY_LABEL[Math.round(summary.best.avg ?? 0)]}
                                        </strong>.
                                    </span>
                                </li>
                            )}
                        </ul>
                    </div>
                )
            })()}

            {/* Advanced Insights Grid */}
            {!isEmpty && (
                <div className="pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-500" />
                        Análisis Detallado
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* 1. Distribución de Energía (Progress Bar) */}
                        {(() => {
                            const dist = buildEnergyDistribution(filteredLogs)
                            if (!dist) return null
                            return (
                                <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white shadow-sm">
                                    <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                                        Distribución Global
                                    </h4>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                        {dist.regulada > 0 && <div style={{ width: `${(dist.regulada / dist.total) * 100}%` }} className="h-full bg-emerald-500" title={`Regulada: ${dist.regulada}`} />}
                                        {dist.inquieta > 0 && <div style={{ width: `${(dist.inquieta / dist.total) * 100}%` }} className="h-full bg-amber-500" title={`Inquieta: ${dist.inquieta}`} />}
                                        {dist.apatica > 0 && <div style={{ width: `${(dist.apatica / dist.total) * 100}%` }} className="h-full bg-indigo-500" title={`Apática: ${dist.apatica}`} />}
                                        {dist.explosiva > 0 && <div style={{ width: `${(dist.explosiva / dist.total) * 100}%` }} className="h-full bg-rose-500" title={`Explosiva: ${dist.explosiva}`} />}
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" />{Math.round((dist.regulada / dist.total) * 100)}% Reg.</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" />{Math.round((dist.inquieta / dist.total) * 100)}% Inq.</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500" />{Math.round((dist.apatica / dist.total) * 100)}% Apá.</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" />{Math.round((dist.explosiva / dist.total) * 100)}% Exp.</span>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* 2. Mapa de Calor Semanal */}
                        {(() => {
                            const heatmap = buildDayOfWeekHeatmap(filteredLogs)
                            const colorMap: Record<number, string> = { 1: "bg-rose-100 text-rose-700 border-rose-200", 2: "bg-indigo-100 text-indigo-700 border-indigo-200", 3: "bg-amber-100 text-amber-700 border-amber-200", 4: "bg-emerald-100 text-emerald-700 border-emerald-200" }
                            return (
                                <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white shadow-sm">
                                    <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                        <CalendarDays className="w-4 h-4 text-blue-500" />
                                        Tendencia por Día
                                    </h4>
                                    <div className="flex justify-between gap-2 h-14">
                                        {heatmap.map((d) => (
                                            <div key={d.name} className={`flex-1 rounded-lg flex flex-col items-center justify-center border ${d.avg ? colorMap[d.avg] : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                                                <span className="text-xs font-medium">{d.name}</span>
                                                <span className="text-[10px] opacity-75">{d.avg ? ENERGY_LABEL[d.avg].slice(0, 3) : "-"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}

                        {/* 3. Días Críticos */}
                        {(() => {
                            const critical = buildCriticalDays(filteredLogs)
                            if (!critical || critical.best.date === critical.worst.date) return null
                            return (
                                <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white shadow-sm">
                                    <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        Días Destacados
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <span className="text-xs font-medium text-emerald-800">Mejor clima</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-emerald-900">{critical.best.dateFormatted}</p>
                                                <p className="text-[10px] text-emerald-600">{ENERGY_LABEL[Math.round(critical.best.avg)]}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center p-2 rounded-lg bg-rose-50 border border-rose-100">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="w-4 h-4 text-rose-500" />
                                                <span className="text-xs font-medium text-rose-800">Día complejo</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-rose-900">{critical.worst.dateFormatted}</p>
                                                <p className="text-[10px] text-rose-600">{ENERGY_LABEL[Math.round(critical.worst.avg)]}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* 4. Ranking Docente (Solo visible si hay más de 1 docente comparándose) */}
                        {groupBy === "course" && (() => {
                            const ranking = buildTeacherRanking(filteredLogs, teachers)
                            if (ranking.length <= 1) return null
                            return (
                                <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white shadow-sm">
                                    <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                        Participación Docente
                                    </h4>
                                    <div className="space-y-2">
                                        {ranking.map((t, i) => (
                                            <div key={t.name} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 font-medium w-3">{i + 1}.</span>
                                                    <span className="text-slate-700 truncate max-w-[120px] sm:max-w-[180px]">{t.name}</span>
                                                </div>
                                                <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{t.count} reg.</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}
