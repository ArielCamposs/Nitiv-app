"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { revalidateClimaPage } from "@/actions/clima"
import { ClimateRegisterCard } from "@/components/teacher/climate-register-card"
import { ClimateHistoryChart } from "@/components/teacher/climate-history-chart"
import { BarChart3, TrendingUp, Calendar, Layers } from "lucide-react"
import {
    CLIMATE_STATS_ORDER,
    initClimateCountMap,
    climateScoreForAggregation,
    climateLabel,
    climateColor,
} from "@/lib/climate-evaluation"

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
    teacherId,
    institutionId,
    courses,
    allInstitutionCourses,
    teacherLogs,
    historyLogs,
    teachers,
}: Props) {
    void courses
    const router = useRouter()
    const [tab, setTab] = useState<"resumen" | "historial" | "estadisticas">("resumen")
    const [selectedCourseId, setSelectedCourseId] = useState<string>(
        allInstitutionCourses.length > 0 ? allInstitutionCourses[0].id : ""
    )

    const stats = useMemo(() => {
        const total = historyLogs.length
        const mine = teacherLogs.length
        const byLevel = initClimateCountMap()
        historyLogs.forEach((l: any) => {
            const k = l.energy_level || "regulada"
            byLevel[k] = (byLevel[k] ?? 0) + 1
        })
        const avgGlobal =
            total > 0
                ? historyLogs.reduce(
                      (a: number, l: any) => a + climateScoreForAggregation(l.energy_level),
                      0
                  ) / total
                : null
        const dominant =
            total > 0
                ? (Object.entries(byLevel).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
                : null

        const byCourse = (allInstitutionCourses as any[])
            .map((course: any) => {
                const id = course.id
                const logs = historyLogs.filter((l: any) => l.course_id === id)
                const n = logs.length
                const courseAvg =
                    n > 0
                        ? logs.reduce(
                              (a: number, l: any) => a + climateScoreForAggregation(l.energy_level),
                              0
                          ) / n
                        : null
                const acc: Record<string, number> = initClimateCountMap()
                logs.forEach((l: any) => {
                    const k = l.energy_level || "regulada"
                    acc[k] = (acc[k] ?? 0) + 1
                })
                const courseDominant =
                    n > 0
                        ? (Object.entries(acc).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
                        : null
                return {
                    name: course.name,
                    id,
                    count: n,
                    avg: courseAvg,
                    dominant: courseDominant,
                }
            })
            .filter((c) => c.count > 0)
            .sort((a, b) => b.count - a.count)

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
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { key: "resumen", label: "Resumen" },
                    { key: "historial", label: "Historial" },
                    { key: "estadisticas", label: "Estadísticas" },
                ].map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as "resumen" | "historial" | "estadisticas")}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                            tab === t.key
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "resumen" && allInstitutionCourses.length > 0 && (
                <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-sm font-semibold text-slate-700">Curso:</span>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="text-sm border-none bg-slate-100/80 hover:bg-slate-100 text-slate-700 font-medium rounded-lg px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20 w-fit sm:min-w-[200px]"
                    >
                        {allInstitutionCourses.map((c: any) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {tab === "resumen" && selectedCourseId && (
                <div className="space-y-6 pt-4">
                    <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden">
                        <div className="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100">
                            <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                <span>🌤️</span> Registrar clima de esta clase
                            </h3>
                        </div>
                        <div className="p-4">
                            <ClimateRegisterCard
                                teacherId={teacherId}
                                courseId={selectedCourseId}
                                institutionId={institutionId}
                                hideCourseSelector
                                onRegistered={async () => {
                                    await revalidateClimaPage()
                                    router.refresh()
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {tab === "historial" && (
                <ClimateHistoryChart
                    courses={allInstitutionCourses}
                    historyLogs={historyLogs}
                    teachers={teachers}
                />
            )}

            {tab === "estadisticas" && (
                <div className="space-y-6 pt-2">
                    <div className="flex items-center gap-2 text-slate-700 mb-4">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-lg font-bold">Datos importantes del clima emocional</h2>
                    </div>

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
                                <span className="text-xs font-medium">Promedio clima (1–5)</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800">
                                {stats.avgGlobal != null ? stats.avgGlobal.toFixed(1) : "—"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                                Clima predominante
                            </span>
                            <p
                                className="text-lg font-bold"
                                style={{
                                    color: stats.dominant ? climateColor(stats.dominant) : undefined,
                                }}
                            >
                                {stats.dominant ? climateLabel(stats.dominant) : "Sin datos"}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-500" />
                            Distribución por tipo de clima (90 días)
                        </h3>
                        {stats.totalRegistros === 0 ? (
                            <p className="text-sm text-slate-400">Aún no hay registros en el período.</p>
                        ) : (
                            <div className="space-y-3">
                                {CLIMATE_STATS_ORDER.map((key) => {
                                    const count = stats.byLevel[key] ?? 0
                                    const pct =
                                        stats.totalRegistros > 0
                                            ? Math.round((count / stats.totalRegistros) * 100)
                                            : 0
                                    const fill = climateColor(key)
                                    return (
                                        <div key={key}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="font-medium text-slate-800">
                                                    {climateLabel(key)}
                                                </span>
                                                <span className="text-slate-500">
                                                    {count} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${pct}%`,
                                                        backgroundColor: fill,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

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
                                                    <span
                                                        className="ml-2 font-medium"
                                                        style={{ color: climateColor(c.dominant) }}
                                                    >
                                                        · {climateLabel(c.dominant)}
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
