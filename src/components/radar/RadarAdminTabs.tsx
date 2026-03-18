"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpenCheck, CalendarDays, X, BarChart3, Users } from "lucide-react"
import Link from "next/link"
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
function scoreColorForNote(avg: number): string {
    if (avg < 2.5) return "#ef4444"
    if (avg < 3.5) return "#f59e0b"
    return "#22c55e"
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
    const today = new Date()
    const currentYear = today.getFullYear()

    // Modal state: selected month (0-11) or null
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

    // Mapa mes → sesiones que ocurrieron en ese mes
    // Cada entrada: { course, session }
    type SessionEntry = {
        courseName: string
        section: string | null
        sessionId: string
        period: string
        activatedAt: string
        responseCount: number
    }
    const sessionsByMonth = useMemo(() => {
        const map: Record<number, SessionEntry[]> = {}
        for (let m = 0; m < 12; m++) map[m] = []
        for (const c of courses) {
            for (const s of c.sessions) {
                if (!s.activated_at || !s.id) continue
                const d = new Date(s.activated_at)
                if (d.getFullYear() !== currentYear) continue
                const mo = d.getMonth()
                map[mo].push({
                    courseName: c.name,
                    section: c.section ?? null,
                    sessionId: s.id,
                    period: s.period,
                    activatedAt: s.activated_at,
                    responseCount: s.response_count,
                })
            }
        }
        return map
    }, [courses, currentYear])

    const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

    const PERIOD_LABELS: Record<string, string> = {
        inicio_s1: "Inicio S1", termino_s1: "Término S1",
        inicio_s2: "Inicio S2", termino_s2: "Término S2",
    }

    const selectedSessions = selectedMonth !== null ? sessionsByMonth[selectedMonth] : []
    const selectedMonthName = selectedMonth !== null ? MONTH_NAMES[selectedMonth] : ""

    const searchParams = useSearchParams()
    const initialTab = searchParams.get("tab") ?? "cuestionario"

    return (
        <Tabs defaultValue={initialTab} className="space-y-4">
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
                {/* ── Modal de detalle del mes ── */}
                {selectedMonth !== null && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setSelectedMonth(null)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-sky-500" />
                                    <h3 className="text-sm font-bold text-slate-800">
                                        {selectedMonthName} {currentYear}
                                    </h3>
                                    <span className="text-[11px] font-semibold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                                        {selectedSessions.length} sesión{selectedSessions.length !== 1 ? "es" : ""}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedMonth(null)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto flex-1 p-4 space-y-2">
                                {selectedSessions.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-8">
                                        No hay sesiones de Radar en este mes.
                                    </p>
                                ) : (
                                    selectedSessions
                                        .sort((a, b) => new Date(a.activatedAt).getTime() - new Date(b.activatedAt).getTime())
                                        .map(sess => (
                                            <div
                                                key={sess.sessionId}
                                                className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate">
                                                        {sess.courseName}{sess.section ? ` ${sess.section}` : ""}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        {PERIOD_LABELS[sess.period] ?? sess.period}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Users className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[10px] text-slate-400">
                                                            {sess.responseCount} respuesta{sess.responseCount !== 1 ? "s" : ""}
                                                        </span>
                                                        <span className="text-[10px] text-slate-300 ml-1">
                                                            · {new Date(sess.activatedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/${role}/radar/resultados/${sess.sessionId}`}
                                                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                                                >
                                                    <BarChart3 className="w-3 h-3" />
                                                    Ver resultados
                                                </Link>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <Card>
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
                                <CalendarDays className="w-5 h-5 text-sky-600" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                                    Aplicación del cuestionario
                                </h2>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                    Vista anual de aplicación del Radar de Competencias. Haz clic en un mes para ver el detalle.
                                </p>
                            </div>
                        </div>

                        {/* Calendario anual */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                            <p className="text-[11px] font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                                Año {currentYear} — clic en un mes para ver detalle
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {MONTH_NAMES.map((name, mi) => {
                                    const sessions = sessionsByMonth[mi] ?? []
                                    const count = sessions.length
                                    const isCurrentMonth = mi === today.getMonth()
                                    const isFuture = mi > today.getMonth()
                                    return (
                                        <button
                                            key={mi}
                                            type="button"
                                            onClick={() => setSelectedMonth(mi)}
                                            className={`relative flex flex-col items-center justify-center rounded-xl border py-3 px-2 text-center transition-all hover:shadow-md group ${
                                                isCurrentMonth
                                                    ? "border-sky-400 bg-sky-50 ring-1 ring-sky-300"
                                                    : count > 0
                                                        ? "border-indigo-200 bg-white hover:border-indigo-400 cursor-pointer"
                                                        : isFuture
                                                            ? "border-slate-100 bg-slate-50/50 opacity-50 cursor-default"
                                                            : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                                            }`}
                                            disabled={isFuture && count === 0}
                                        >
                                            <span className={`text-xs font-bold ${
                                                isCurrentMonth ? "text-sky-700" : count > 0 ? "text-slate-800" : "text-slate-400"
                                            }`}>
                                                {name}
                                            </span>
                                            {count > 0 ? (
                                                <span className="mt-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold shadow-sm">
                                                    {count}
                                                </span>
                                            ) : (
                                                <span className="mt-1.5 text-[10px] text-slate-300">—</span>
                                            )}
                                            {isCurrentMonth && (
                                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="mt-3 text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[8px] font-bold">N</span>
                                = Número de sesiones de Radar aplicadas en ese mes
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Gestión de sesiones por curso */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold text-slate-800">Activar Radar por curso</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Selecciona el período y activa el cuestionario para los cursos que quieras.</p>
                    </div>
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
                                                return (
                                                    <div
                                                        key={ax}
                                                        className="rounded-2xl border shadow-sm p-4"
                                                        style={{ backgroundColor: `${meta.color}12`, borderColor: `${meta.color}50` }}
                                                    >
                                                        <div className="flex items-center justify-between mb-2 gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-xl shrink-0">{meta.emoji}</span>
                                                                <p className="text-xs sm:text-sm font-bold truncate" style={{ color: meta.color }}>
                                                                    {meta.label}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm sm:text-lg font-extrabold" style={{ color: scoreColorForNote(avg) }}>
                                                                {avg.toFixed(1)}
                                                                <span className="text-[10px] text-slate-400">/5</span>
                                                            </p>
                                                        </div>
                                                        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{ width: `${(avg / 5) * 100}%`, backgroundColor: meta.color }}
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
                                                return (
                                                    <div
                                                        key={ax}
                                                        className="rounded-2xl border shadow-sm p-4 w-full"
                                                        style={{ backgroundColor: `${meta.color}12`, borderColor: `${meta.color}50` }}
                                                    >
                                                        <div className="flex items-center justify-between mb-2 gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-xl shrink-0">{meta.emoji}</span>
                                                                <p className="text-xs sm:text-sm font-bold truncate" style={{ color: meta.color }}>
                                                                    {meta.label}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm sm:text-lg font-extrabold" style={{ color: scoreColorForNote(avg) }}>
                                                                {avg.toFixed(1)}
                                                                <span className="text-[10px] text-slate-400">/5</span>
                                                            </p>
                                                        </div>
                                                        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{ width: `${(avg / 5) * 100}%`, backgroundColor: meta.color }}
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

