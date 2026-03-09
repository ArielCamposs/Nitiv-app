"use client"

import { useState } from "react"
import { ClimateRegisterCard } from "@/components/teacher/climate-register-card"
import { ClimateHistoryChart } from "@/components/teacher/climate-history-chart"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

const ENERGY_LABEL: Record<string, { label: string; color: string }> = {
    explosiva: { label: "Explosiva", color: "text-red-600" },
    apatica: { label: "Apática", color: "text-blue-500" },
    inquieta: { label: "Inquieta", color: "text-yellow-600" },
    regulada: { label: "Regulada", color: "text-green-600" },
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
    const [tab, setTab] = useState<"resumen" | "historial">("resumen")
    const [selectedCourseId, setSelectedCourseId] = useState<string>(
        courses.length > 0 ? courses[0].course_id : "todos"
    )

    const coursesToRender = selectedCourseId === "todos"
        ? courses
        : courses.filter(c => c.course_id === selectedCourseId)

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { key: "resumen", label: "Resumen" },
                    { key: "historial", label: "Historial" },
                ].map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as any)}
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
        </div>
    )
}
