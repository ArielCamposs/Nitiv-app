"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpenCheck, CalendarDays } from "lucide-react"
import { RadarManagerClient, type CourseWithSessions } from "@/components/radar/RadarManagerClient"
import { RadarChart } from "@/components/radar/RadarChart"

export interface CourseAxisStats {
    courseId: string
    courseName: string
    section: string | null
    responseCount: number
    avgByAxis: Partial<Record<string, number>>
    overallAvg: number
}

export interface StudentAxisStats {
    studentId: string
    fullName: string
    courseName: string
    section: string | null
    avgByAxis: Partial<Record<string, number>>
    overallAvg: number
}

interface Props {
    courses: CourseWithSessions[]
    institutionId: string
    role: "dupla" | "convivencia"
    globalAvg?: Partial<Record<string, number>>
    distribution?: Partial<Record<string, number[]>>
    courseStats?: CourseAxisStats[]
    atRiskStudents?: StudentAxisStats[]
}

// Versión de solo lectura del cuestionario, basada en el formulario de estudiante
const SAMPLE_QUESTIONS = [
    { axis: "Autoconciencia", items: [
        "Puedo identificar lo que siento en distintas situaciones",
        "Reconozco mis fortalezas y áreas en las que puedo mejorar",
        "Entiendo cómo mis emociones afectan mi comportamiento",
    ]},
    { axis: "Autogestión", items: [
        "Puedo mantener la calma cuando estoy frustrado/a o enojado/a",
        "Organizo mi tiempo para cumplir con mis tareas",
        "Me motivo para alcanzar mis metas aunque sea difícil",
    ]},
    { axis: "Conciencia social", items: [
        "Me pongo en el lugar de los demás cuando tienen un problema",
        "Respeto las opiniones y sentimientos de otras personas aunque sean diferentes a los míos",
    ]},
    { axis: "Habilidades relacionales", items: [
        "Puedo comunicar lo que pienso y siento de manera clara y respetuosa",
        "Trabajo bien en equipo y colaboro con mis compañeros/as",
        "Sé pedir ayuda cuando la necesito",
    ]},
    { axis: "Toma de decisiones", items: [
        "Pienso en las consecuencias antes de tomar una decisión",
        "Busco soluciones pacíficas cuando tengo un conflicto",
    ]},
]

const OPTION_LABELS = [
    "Me cuesta mucho",
    "Me cuesta un poco",
    "A veces lo logro",
    "Lo hago bien",
    "Lo hago excelente",
]

const AXES_META: Record<string, { label: string; emoji: string; color: string }> = {
    ac: { label: "Autoconciencia",     emoji: "🧠", color: "#db2777" },
    ag: { label: "Autogestión",        emoji: "🎯", color: "#7c3aed" },
    cs: { label: "Conciencia Social",  emoji: "🤝", color: "#d97706" },
    hr: { label: "Hab. Relacionales",  emoji: "💬", color: "#4f46e5" },
    td: { label: "Toma de Decisiones", emoji: "⚖️", color: "#b45309" },
}
const AXIS_ORDER = ["ac", "ag", "cs", "hr", "td"] as const

function getAxisAlertClasses(avg: number | undefined) {
    if (avg === undefined || Number.isNaN(avg)) {
        return {
            card: "bg-slate-50 border-slate-200",
            pill: "bg-slate-200 text-slate-700",
            text: "text-slate-800",
            bar: "#64748b",
        }
    }
    if (avg < 2.5) {
        return {
            card: "bg-rose-50 border-rose-200",
            pill: "bg-rose-100 text-rose-800",
            text: "text-rose-800",
            bar: "#ef4444",
        }
    }
    if (avg < 3.5) {
        return {
            card: "bg-amber-50 border-amber-200",
            pill: "bg-amber-100 text-amber-800",
            text: "text-amber-800",
            bar: "#f59e0b",
        }
    }
    return {
        card: "bg-emerald-50 border-emerald-200",
        pill: "bg-emerald-100 text-emerald-800",
        text: "text-emerald-800",
        bar: "#10b981",
    }
}
function getCourseShortCode(name: string, section: string | null | undefined): { code: string; isMedia: boolean } {
    const isMedia = /medio|media|1°m|2°m|3°m|4°m|i°|ii°|iii°|iv°/i.test(name)
    const numMatch = name.match(/\d+/)
    const grade = numMatch ? numMatch[0] : name.trim().split(/\s+/)[0]?.[0] ?? ""
    const secRaw = (section ?? "").trim()
    const sec = secRaw ? secRaw[0] : (name.match(/[A-D]/i)?.[0] ?? "")
    const cycle = isMedia ? "M" : "B"
    const base = `${grade}${cycle}${sec}`.toUpperCase()
    return { code: base || name.slice(0, 3).toUpperCase(), isMedia }
}

export function RadarAdminTabs({ courses, institutionId, role, globalAvg, distribution, courseStats, atRiskStudents }: Props) {
    // Mapa de fechas → cursos que aplicaron radar ese día (YYYY-MM-DD)
    const datesByDay = useMemo(() => {
        const map: Record<string, { code: string; isMedia: boolean }[]> = {}
        for (const c of courses) {
            const { code, isMedia } = getCourseShortCode(c.name, c.section ?? null)
            for (const s of c.sessions) {
                if (!s.activated_at) continue
                const d = new Date(s.activated_at)
                const key = d.toISOString().slice(0, 10)
                if (!map[key]) map[key] = []
                // evitar duplicados por curso en el mismo día
                if (!map[key].some((item) => item.code === code)) {
                    map[key].push({ code, isMedia })
                }
            }
        }
        return map
    }, [courses])

    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-11

    const calendarDays = useMemo(() => {
        const first = new Date(currentYear, currentMonth, 1)
        const last = new Date(currentYear, currentMonth + 1, 0)
        const days: { day: number; key: string; applications: { code: string; isMedia: boolean }[] }[] = []

        for (let d = 1; d <= last.getDate(); d++) {
            const date = new Date(currentYear, currentMonth, d)
            const key = date.toISOString().slice(0, 10)
            const applications = datesByDay[key] ?? []
            days.push({ day: d, key, applications })
        }
        return { days, firstWeekday: first.getDay() || 7 } // 1-7, lunes=?
    }, [currentYear, currentMonth, datesByDay])

    return (
        <Tabs defaultValue="cuestionario" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="cuestionario" className="text-[11px] sm:text-xs px-1.5 sm:px-3">
                    Cuestionario
                </TabsTrigger>
                <TabsTrigger value="aplicacion" className="text-[11px] sm:text-xs px-1.5 sm:px-3">
                    Aplicación
                </TabsTrigger>
                <TabsTrigger value="estadisticas" className="text-[11px] sm:text-xs px-1.5 sm:px-3">
                    Estadísticas
                </TabsTrigger>
            </TabsList>

            <TabsContent value="cuestionario" className="space-y-4">
                <Card>
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <BookOpenCheck className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">Cuestionario de ejemplo</h2>
                                <p className="text-xs text-slate-500">
                                    Vista de referencia del cuestionario que responden los estudiantes. No es editable desde aquí.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {SAMPLE_QUESTIONS.map((axis) => (
                                <div key={axis.axis} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                    <p className="text-xs font-semibold text-slate-700 mb-2">{axis.axis}</p>
                                    <ul className="space-y-1.5">
                                        {axis.items.map((q) => (
                                            <li key={q} className="text-[11px] text-slate-600 flex gap-1.5">
                                                <span className="mt-[3px] h-1 w-1 rounded-full bg-slate-400" />
                                                <span>{q}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold text-slate-700 mb-2">
                                Opciones de respuesta (escala tipo Likert)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {OPTION_LABELS.map((opt) => (
                                    <span
                                        key={opt}
                                        className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600"
                                    >
                                        {opt}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="aplicacion" className="space-y-4">
                <Card>
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
                                <CalendarDays className="w-5 h-5 text-sky-600" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug break-words">
                                    Aplicación del cuestionario
                                </h2>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                    Visualiza en qué fechas se ha aplicado el Radar de Competencias para todos los cursos.
                                </p>
                            </div>
                        </div>

                        {/* Calendario simple del mes actual */}
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70">
                            <p className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                                Calendario de aplicación (mes actual)
                            </p>
                            <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500 mb-1">
                                {["L", "M", "M", "J", "V", "S", "D"].map((d, idx) => (
                                    <span key={`${d}-${idx}`} className="text-center font-semibold">
                                        {d}
                                    </span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-[10px]">
                                {Array.from({
                                    length: calendarDays.firstWeekday === 1 ? 0 : calendarDays.firstWeekday - 1,
                                }).map((_, idx) => (
                                    <span key={`empty-${idx}`} />
                                ))}
                                {calendarDays.days.map((d) => {
                                    const hasAny = d.applications.length > 0
                                    const codesToShow = d.applications.slice(0, 3)
                                    const overflow = d.applications.length > 3 ? d.applications.length - 3 : 0
                                    return (
                                        <div
                                            key={d.key}
                                            className={`min-h-[2.25rem] flex flex-col items-center justify-start rounded-md border px-0.5 py-0.5 ${
                                                hasAny
                                                    ? "bg-white border-slate-300"
                                                    : "bg-white border-slate-200 text-slate-500"
                                            }`}
                                        >
                                            <span className="text-[10px] font-semibold mb-0.5 text-slate-600">
                                                {d.day}
                                            </span>
                                            {hasAny && (
                                                <div className="flex flex-wrap gap-[1px] justify-center">
                                                    {codesToShow.map((app) => (
                                                        <span
                                                            key={app.code}
                                                            className={`px-1.5 py-[1px] rounded-full border text-[9px] font-semibold ${
                                                                app.isMedia
                                                                    ? "bg-violet-100 border-violet-200 text-violet-800"
                                                                    : "bg-sky-100 border-sky-200 text-sky-800"
                                                            }`}
                                                        >
                                                            {app.code}
                                                        </span>
                                                    ))}
                                                    {overflow > 0 && (
                                                        <span className="px-1 py-[1px] rounded-full bg-slate-100 text-slate-600 text-[9px] font-semibold">
                                                            +{overflow}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-sky-200 border border-sky-300" />
                                    Básica (ej: 3BB, 2BA)
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-violet-200 border border-violet-300" />
                                    Media (ej: 4MB, 3MA)
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Gestión de sesiones por curso */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Gestión por curso y período</h3>
                    <RadarManagerClient courses={courses} institutionId={institutionId} role={role} />
                </section>
            </TabsContent>

            {/* Estadísticas generales por eje (sobre todos los cursos) */}
            <TabsContent value="estadisticas" className="space-y-4">
                <Card>
                    <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug break-words">
                                    Estadísticas generales por eje
                                </h2>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                    Promedios y distribución de respuestas considerando todos los cursos que han respondido el Radar.
                                </p>
                            </div>
                        </div>

                        {globalAvg && Object.keys(globalAvg).length > 0 ? (
                            <div className="space-y-4">
                                {/* Cursos con mejores promedios generales */}
                                {courseStats && courseStats.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                            Cursos con mejores promedios generales
                                        </h3>
                                        <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-100 text-slate-500">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-semibold">Curso</th>
                                                        <th className="px-3 py-2 text-center font-semibold hidden sm:table-cell">
                                                            Respuestas
                                                        </th>
                                                        <th className="px-3 py-2 text-center font-semibold">
                                                            Prom. general
                                                        </th>
                                                        <th className="px-3 py-2 text-left font-semibold hidden md:table-cell">
                                                            Ejes destacados
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {courseStats.slice(0, 10).map((c, idx) => (
                                                        <tr key={c.courseId} className="border-t border-slate-100">
                                                            <td className="px-3 py-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] font-bold text-slate-400 w-4 text-right">
                                                                        #{idx + 1}
                                                                    </span>
                                                                    <span className="text-xs font-semibold text-slate-800">
                                                                        {c.courseName}{c.section ? ` ${c.section}` : ""}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 text-center text-slate-500 hidden sm:table-cell">
                                                                {c.responseCount}
                                                            </td>
                                                            <td className="px-3 py-2 text-center font-bold text-slate-800">
                                                                {c.overallAvg.toFixed(1)}
                                                                <span className="text-[10px] text-slate-400"> /5</span>
                                                            </td>
                                                            <td className="px-3 py-2 hidden md:table-cell">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {AXIS_ORDER.map(ax => {
                                                                        const v = c.avgByAxis[ax]
                                                                        if (!v) return null
                                                                        const meta = AXES_META[ax]
                                                                        return (
                                                                            <span
                                                                                key={ax}
                                                                                className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600"
                                                                            >
                                                                                <span className="mr-1">{meta.emoji}</span>
                                                                                {v.toFixed(1)}
                                                                            </span>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Cursos que requieren mayor atención */}
                                {courseStats && courseStats.length > 1 && (
                                    <div className="mt-6 space-y-2">
                                        <h3 className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
                                            Cursos que requieren más atención
                                        </h3>
                                        <div className="bg-rose-50 border border-rose-100 rounded-2xl overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-rose-100/80 text-rose-700">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-semibold">Curso</th>
                                                        <th className="px-3 py-2 text-center font-semibold hidden sm:table-cell">
                                                            Respuestas
                                                        </th>
                                                        <th className="px-3 py-2 text-center font-semibold">
                                                            Prom. general
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[...courseStats]
                                                        .slice()
                                                        .sort((a, b) => a.overallAvg - b.overallAvg)
                                                        .slice(0, 5)
                                                        .map((c, idx) => (
                                                            <tr key={c.courseId} className="border-t border-rose-100">
                                                                <td className="px-3 py-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] font-bold text-rose-400 w-4 text-right">
                                                                            #{idx + 1}
                                                                        </span>
                                                                        <span className="text-xs font-semibold text-rose-900">
                                                                            {c.courseName}{c.section ? ` ${c.section}` : ""}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2 text-center text-rose-700 hidden sm:table-cell">
                                                                    {c.responseCount}
                                                                </td>
                                                                <td className="px-3 py-2 text-center font-bold text-rose-900">
                                                                    {c.overallAvg.toFixed(1)}
                                                                    <span className="text-[10px] text-rose-500"> /5</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Estudiantes que requieren mayor atención */}
                                {atRiskStudents && atRiskStudents.length > 0 && (
                                    <>
                                        <div className="mt-6 space-y-2">
                                            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                                Estudiantes con puntajes más bajos (autoevaluación)
                                            </h3>
                                            <p className="text-[10px] text-slate-500">
                                                Úsalo como orientación inicial. Complementa siempre con información cualitativa y otros registros.
                                            </p>
                                            <div className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-amber-100/80 text-amber-800">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-semibold">Estudiante</th>
                                                            <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">Curso</th>
                                                            <th className="px-3 py-2 text-center font-semibold">
                                                                Prom. general
                                                            </th>
                                                            <th className="px-3 py-2 text-left font-semibold hidden md:table-cell">
                                                                Ejes más desafiantes
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {atRiskStudents.slice(0, 5).map((s, idx) => {
                                                            const sortedAxes = AXIS_ORDER
                                                                .filter(ax => s.avgByAxis[ax] !== undefined)
                                                                .sort((a, b) => (s.avgByAxis[a]! - s.avgByAxis[b]!))
                                                                .slice(0, 2)
                                                            return (
                                                                <tr key={s.studentId} className="border-t border-amber-100">
                                                                    <td className="px-3 py-2">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] font-bold text-amber-500 w-4 text-right">
                                                                                #{idx + 1}
                                                                            </span>
                                                                            <span className="text-xs font-semibold text-amber-900">
                                                                                {s.fullName}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-xs text-amber-900 hidden sm:table-cell">
                                                                        {s.courseName}{s.section ? ` ${s.section}` : ""}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center font-bold text-amber-900">
                                                                        {s.overallAvg.toFixed(1)}
                                                                        <span className="text-[10px] text-amber-600"> /5</span>
                                                                    </td>
                                                                    <td className="px-3 py-2 hidden md:table-cell">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {sortedAxes.map(ax => {
                                                                                const v = s.avgByAxis[ax]
                                                                                if (!v) return null
                                                                                const meta = AXES_META[ax]
                                                                                return (
                                                                                    <span
                                                                                        key={ax}
                                                                                        className="inline-flex items-center rounded-full bg-white border border-amber-200 px-2 py-0.5 text-[10px] text-amber-800"
                                                                                    >
                                                                                        <span className="mr-1">{meta.emoji}</span>
                                                                                        {meta.label.split(" ")[0]} {v.toFixed(1)}
                                                                                    </span>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Estudiantes con mejores puntajes generales */}
                                        <div className="mt-6 space-y-2">
                                            <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                                Estudiantes con mejores puntajes generales
                                            </h3>
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl overflow-hidden">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-emerald-100/80 text-emerald-800">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-semibold">Estudiante</th>
                                                            <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">Curso</th>
                                                            <th className="px-3 py-2 text-center font-semibold">
                                                                Prom. general
                                                            </th>
                                                            <th className="px-3 py-2 text-left font-semibold hidden md:table-cell">
                                                                Ejes más fuertes
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[...atRiskStudents]
                                                            .slice()
                                                            .sort((a, b) => b.overallAvg - a.overallAvg)
                                                            .slice(0, 5)
                                                            .map((s, idx) => {
                                                                const strongestAxes = AXIS_ORDER
                                                                    .filter(ax => s.avgByAxis[ax] !== undefined)
                                                                    .sort((a, b) => (s.avgByAxis[b]! - s.avgByAxis[a]!))
                                                                    .slice(0, 2)
                                                                return (
                                                                    <tr key={s.studentId} className="border-t border-emerald-100">
                                                                        <td className="px-3 py-2">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-[10px] font-bold text-emerald-500 w-4 text-right">
                                                                                    #{idx + 1}
                                                                                </span>
                                                                                <span className="text-xs font-semibold text-emerald-900">
                                                                                    {s.fullName}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-xs text-emerald-900 hidden sm:table-cell">
                                                                            {s.courseName}{s.section ? ` ${s.section}` : ""}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center font-bold text-emerald-900">
                                                                            {s.overallAvg.toFixed(1)}
                                                                            <span className="text-[10px] text-emerald-600"> /5</span>
                                                                        </td>
                                                                        <td className="px-3 py-2 hidden md:table-cell">
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {strongestAxes.map(ax => {
                                                                                    const v = s.avgByAxis[ax]
                                                                                    if (!v) return null
                                                                                    const meta = AXES_META[ax]
                                                                                    return (
                                                                                        <span
                                                                                            key={ax}
                                                                                            className="inline-flex items-center rounded-full bg-white border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800"
                                                                                        >
                                                                                            <span className="mr-1">{meta.emoji}</span>
                                                                                            {meta.label.split(" ")[0]} {v.toFixed(1)}
                                                                                        </span>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Radar global y promedios por eje */}
                                <div className="space-y-4">
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                        <RadarChart
                                            scores={{
                                                ac: globalAvg["ac"] ?? 0,
                                                ag: globalAvg["ag"] ?? 0,
                                                cs: globalAvg["cs"] ?? 0,
                                                hr: globalAvg["hr"] ?? 0,
                                                td: globalAvg["td"] ?? 0,
                                            }}
                                            size={260}
                                        />
                                    </div>

                                    <div className="grid gap-3">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {AXIS_ORDER.slice(0, 3).map(ax => {
                                                const avg = globalAvg[ax]
                                                const dist = distribution?.[ax]
                                                if (avg === undefined || !dist) return null
                                                const meta = AXES_META[ax]
                                                const classes = getAxisAlertClasses(avg)
                                                return (
                                                    <div key={ax} className={`rounded-2xl border shadow-sm p-4 ${classes.card}`}>
                                                        <div className="flex items-center justify-between mb-2 gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-xl shrink-0">{meta.emoji}</span>
                                                                <p className={`text-xs sm:text-sm font-bold truncate ${classes.text}`}>
                                                                    {meta.label}
                                                                </p>
                                                            </div>
                                                            <p className={`text-sm sm:text-lg font-extrabold ${classes.text}`}>
                                                                {avg.toFixed(1)}
                                                                <span className="text-[10px] text-slate-400">/5</span>
                                                            </p>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{ width: `${(avg / 5) * 100}%`, backgroundColor: classes.bar }}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {AXIS_ORDER.slice(3).map(ax => {
                                                const avg = globalAvg[ax]
                                                const dist = distribution?.[ax]
                                                if (avg === undefined || !dist) return null
                                                const meta = AXES_META[ax]
                                                const classes = getAxisAlertClasses(avg)
                                                return (
                                                    <div key={ax} className={`rounded-2xl border shadow-sm p-4 w-full ${classes.card}`}>
                                                        <div className="flex items-center justify-between mb-2 gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-xl shrink-0">{meta.emoji}</span>
                                                                <p className={`text-xs sm:text-sm font-bold truncate ${classes.text}`}>
                                                                    {meta.label}
                                                                </p>
                                                            </div>
                                                            <p className={`text-sm sm:text-lg font-extrabold ${classes.text}`}>
                                                                {avg.toFixed(1)}
                                                                <span className="text-[10px] text-slate-400">/5</span>
                                                            </p>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{ width: `${(avg / 5) * 100}%`, backgroundColor: classes.bar }}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">
                                Aún no hay respuestas registradas en el Radar de Competencias para mostrar estadísticas globales.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}

