"use client"

import { useState, useMemo } from "react"
import { ClimateRegisterCard } from "@/components/teacher/climate-register-card"
import { ClimateHistoryChart } from "@/components/teacher/climate-history-chart"
import { BarChart3, TrendingUp, Calendar, Layers } from "lucide-react"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

const ENERGY_LABEL: Record<string, { label: string; color: string }> = {
    explosiva: { label: "Explosiva", color: "text-red-600" },
    apatica: { label: "Apática", color: "text-blue-500" },
    inquieta: { label: "Inquieta", color: "text-yellow-600" },
    regulada: { label: "Regulada", color: "text-green-600" },
}

const ENERGY_ORDER = ["regulada", "inquieta", "apatica", "explosiva"] as const
const ENERGY_BG: Record<string, string> = {
    regulada: "bg-emerald-500",
    inquieta: "bg-amber-500",
    apatica: "bg-indigo-500",
    explosiva: "bg-red-500",
}

type PulseSession = { id: string; week_start: string; week_end: string } | null

interface Props {
    teacherId: string
    institutionId: string
    courses: any[]
    allInstitutionCourses: any[]
    teacherLogs: any[]
    historyLogs: any[]
    teachers?: { id: string; name: string }[]
}

export function ClimaPageTabs({
    teacherId, institutionId, courses, allInstitutionCourses, teacherLogs, historyLogs, teachers
}: Props) {
    const [tab, setTab] = useState<"resumen" | "historial" | "estadisticas">("resumen")
    const [selectedCourseId, setSelectedCourseId] = useState<string>(
        courses.length > 0 ? courses[0].course_id : "todos"
    )

    const coursesToRender = selectedCourseId === "todos"
        ? courses
        : courses.filter(c => c.course_id === selectedCourseId)

    // Estadísticas globales (historial 90 días + tus registros 28 días)
    const stats = useMemo(() => {
        const total = historyLogs.length
        const mine = teacherLogs.length
        const byLevel: Record<string, number> = {}
        ENERGY_ORDER.forEach(k => { byLevel[k] = 0 })
        historyLogs.forEach((l: any) => {
            const k = l.energy_level || "regulada"
            if (k in byLevel) byLevel[k]++
        })
        const avgGlobal = total > 0
            ? historyLogs.reduce((a: number, l: any) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / total
            : null
        const dominant = total > 0
            ? (Object.entries(byLevel).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
            : null

        const byCourse = (allInstitutionCourses as any[]).map((course: any) => {
            const id = course.id
            const logs = historyLogs.filter((l: any) => l.course_id === id)
            const n = logs.length
            const courseAvg = n > 0
                ? logs.reduce((a: number, l: any) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / n
                : null
            const courseDominant = n > 0
                ? (Object.entries(
                    logs.reduce((acc: Record<string, number>, l: any) => {
                        const k = l.energy_level || "regulada"
                        acc[k] = (acc[k] ?? 0) + 1
                        return acc
                    }, {})
                ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
                : null
            return {
                name: course.name,
                id,
                count: n,
                avg: courseAvg,
                dominant: courseDominant,
            }
        }).filter(c => c.count > 0).sort((a, b) => b.count - a.count)

        return {
            totalRegistros: total,
            registrosDocente: mine,
            byLevel,
            avgGlobal,
            dominant,
            byCourse,
        }
    }, [historyLogs, teacherLogs, allInstitutionCourses])

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { key: "resumen", label: "Resumen" },
                    { key: "historial", label: "Historial" },
                    { key: "estadisticas", label: "Estadísticas" },
                ].map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as "resumen" | "historial" | "estadisticas")}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Selector de Curso Global */}
            {courses.length > 0 && (
                <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-sm font-semibold text-slate-700">Curso:</span>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="text-sm border-none bg-slate-100/80 hover:bg-slate-100 text-slate-700 font-medium rounded-lg px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20 w-fit sm:min-w-[200px]"
                    >
                        {courses.map(c => (
                            <option key={c.course_id} value={c.course_id}>
                                {c.courses?.name} {c.is_head_teacher ? "(Jefatura)" : ""}
                            </option>
                        ))}
                        {courses.length > 1 && <option value="todos">Todos los cursos</option>}
                    </select>
                </div>
            )}

            {/* ── TAB: RESUMEN ── */}
            {tab === "resumen" && coursesToRender.map((c: any) => {
                const courseLogs = teacherLogs.filter(l => l.course_id === c.course_id)
                
                // Promedio considerando todos los registros (mañana/tarde)
                const avg = courseLogs.length > 0
                    ? courseLogs.reduce((a, l) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / courseLogs.length
                    : null

                const dominantLevel = courseLogs.length > 0
                    ? Object.entries(
                        courseLogs.reduce((acc: any, l) => {
                            acc[l.energy_level] = (acc[l.energy_level] ?? 0) + 1
                            return acc
                        }, {})
                    ).sort((a: any, b: any) => b[1] - a[1])[0][0]
                    : null

                const cfg = dominantLevel ? ENERGY_LABEL[dominantLevel] : null

                return (
                    <div key={c.course_id} className="space-y-6 pt-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">
                                {c.courses?.name}
                                {c.is_head_teacher && (
                                    <span className="ml-2 text-xs font-normal text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                        Profesor Jefe
                                    </span>
                                )}
                            </h2>
                        </div>

                        {/* REGISTRO DE CLIMA - AHORA SIEMPRE VISIBLE Y ARRIBA */}
                        <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden">
                            <div className="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100">
                                <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                    <span>🌡️</span> Registrar clima de esta clase
                                </h3>
                            </div>
                            <div className="p-4">
                                <ClimateRegisterCard
                                    teacherId={teacherId}
                                    courseId={c.course_id}
                                    institutionId={institutionId}
                                    allCourses={allInstitutionCourses}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
                                <p className="text-2xl font-bold text-slate-800">{courseLogs.length}</p>
                                <p className="text-xs text-slate-500 mt-1">Registros (28 días)</p>
                            </div>
                            <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
                                <p className={`text-lg font-bold ${cfg?.color ?? "text-slate-400"}`}>
                                    {cfg?.label ?? "Sin datos"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Clima predominante</p>
                            </div>
                            <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
                                <p className="text-2xl font-bold text-slate-800">
                                    {avg !== null ? avg.toFixed(1) : "—"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Promedio energía</p>
                            </div>
                        </div>
                    </div>
                )
            })}

            {/* ── TAB: HISTORIAL ── */}
            {tab === "historial" && (
                <ClimateHistoryChart
                    courses={allInstitutionCourses}
                    historyLogs={historyLogs}
                    teachers={teachers}
                />
            )}

            {/* ── TAB: ESTADÍSTICAS ── */}
            {tab === "estadisticas" && (
                <div className="space-y-6 pt-2">
                    <div className="flex items-center gap-2 text-slate-700 mb-4">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-lg font-bold">Datos importantes del clima emocional</h2>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Layers className="w-4 h-4" />
                                <span className="text-xs font-medium">Total registros (90 días)</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800">{stats.totalRegistros}</p>
                        </div>
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-indigo-600 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-medium">Tus registros (28 días)</span>
                            </div>
                            <p className="text-2xl font-bold text-indigo-700">{stats.registrosDocente}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <span className="text-xs font-medium">Promedio energía</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800">
                                {stats.avgGlobal != null ? stats.avgGlobal.toFixed(1) : "—"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="text-xs font-medium text-slate-500 block mb-1">Clima predominante</span>
                            <p className={`text-lg font-bold ${stats.dominant ? ENERGY_LABEL[stats.dominant]?.color ?? "text-slate-600" : "text-slate-400"}`}>
                                {stats.dominant ? ENERGY_LABEL[stats.dominant]?.label ?? stats.dominant : "Sin datos"}
                            </p>
                        </div>
                    </div>

                    {/* Distribución por nivel de energía */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-500" />
                            Distribución por tipo de clima (90 días)
                        </h3>
                        {stats.totalRegistros === 0 ? (
                            <p className="text-sm text-slate-400">Aún no hay registros en el período.</p>
                        ) : (
                            <div className="space-y-3">
                                {ENERGY_ORDER.map((key) => {
                                    const count = stats.byLevel[key] ?? 0
                                    const pct = stats.totalRegistros > 0 ? Math.round((count / stats.totalRegistros) * 100) : 0
                                    return (
                                        <div key={key}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className={`font-medium ${ENERGY_LABEL[key]?.color ?? "text-slate-600"}`}>
                                                    {ENERGY_LABEL[key]?.label ?? key}
                                                </span>
                                                <span className="text-slate-500">{count} ({pct}%)</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${ENERGY_BG[key] ?? "bg-slate-400"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Por curso */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            Registros por curso
                        </h3>
                        {stats.byCourse.length === 0 ? (
                            <p className="text-sm text-slate-400">No hay registros por curso en el período.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.byCourse.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-800">{c.name}</p>
                                            <p className="text-xs text-slate-500">
                                                Promedio {c.avg != null ? c.avg.toFixed(1) : "—"}
                                                {c.dominant && (
                                                    <span className={`ml-2 font-medium ${ENERGY_LABEL[c.dominant]?.color ?? ""}`}>
                                                        · {ENERGY_LABEL[c.dominant]?.label}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                            {c.count} registros
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
