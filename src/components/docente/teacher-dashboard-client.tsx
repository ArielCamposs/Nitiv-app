"use client"

import { useState } from "react"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from "recharts"
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Users, Thermometer } from "lucide-react"
import { ClimateRegisterCard } from "@/components/teacher/climate-register-card"

const ENERGY_CONFIG = {
    regulada: { label: "Regulada", emoji: "😊", bg: "bg-emerald-500", color: "#10b981" },
    inquieta: { label: "Inquieta", emoji: "😤", bg: "bg-amber-400", color: "#f59e0b" },
    apatica: { label: "Apática", emoji: "😴", bg: "bg-gray-400", color: "#9ca3af" },
    explosiva: { label: "Explosiva", emoji: "🔥", bg: "bg-red-500", color: "#ef4444" },
} as const

export type Tendencia = "mejorando" | "empeorando" | "estable" | "sin_datos"

interface Props {
    profile: { name: string; last_name: string }
    courses: Array<{ id: string; name: string }>
    studentsEnriched: Array<{ id: string; name: string; last_name: string; course_id: string; courseName: string }>
    heatmapData: Array<{ week: string; weekIndex: number; day: string; dayIndex: number; energy: string | null; score: number }>
    chartData: Array<{ semana: string; promedio: number | null }>
    tendencia: Tendencia
    alertsEnriched: Array<{ id: string; student_id: string; type: string; description: string; created_at: string; studentName: string }>
    totalLogs: number
    allInstitutionCourses: Array<{ id: string; name: string }>
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie"]
const WEEK_NAMES = ["S1", "S2", "S3", "S4"]

interface TeacherDashboardClientProps extends Props {
    institutionId: string
    teacherId: string
}

export function TeacherDashboardClient({
    courses, studentsEnriched, heatmapData,
    chartData, tendencia, alertsEnriched,
    institutionId, teacherId, allInstitutionCourses
}: TeacherDashboardClientProps) {
    const [selectedCourse, setSelectedCourse] = useState<string | null>(courses[0]?.id ?? (allInstitutionCourses[0]?.id || null))

    const filteredStudents = selectedCourse
        ? studentsEnriched.filter(s => s.course_id === selectedCourse)
        : studentsEnriched

    const trendColor =
        tendencia === "mejorando" ? "#10b981" :
            tendencia === "empeorando" ? "#ef4444" : "#6b7280"

    const TrendIcon =
        tendencia === "mejorando" ? TrendingUp :
            tendencia === "empeorando" ? TrendingDown : Minus

    const trendLabel =
        tendencia === "mejorando" ? "Mejorando 🎉" :
            tendencia === "empeorando" ? "Empeorando ⚠️" :
                tendencia === "sin_datos" ? "Sin datos" : "Estable 😌"

    const sinDatos = chartData.every(d => d.promedio === null)

    return (
        <div className="space-y-6">

            {/* REGISTRO DE CLIMA - PRIORIDAD MÁXIMA PARA DOCENTE */}
            {selectedCourse && (
                <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <Thermometer className="w-5 h-5" />
                            <h3 className="font-bold">Registrar Clima de Aula</h3>
                        </div>
                        <div className="text-indigo-100 text-xs font-medium bg-white/10 px-2 py-1 rounded-md">
                            Obligatorio · Paso 1
                        </div>
                    </div>
                    <div className="p-5">
                        <ClimateRegisterCard
                            teacherId={teacherId}
                            courseId={selectedCourse}
                            institutionId={institutionId}
                            allCourses={allInstitutionCourses}
                        />
                    </div>
                </div>
            )}

            {/* Selector de curso */}
            {courses.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {courses.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCourse(c.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCourse === c.id
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"
                                }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {/* KPI cards — circle style */}
            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500 shadow-md">
                        <Users className="absolute top-2.5 right-2.5 h-4 w-4 text-white/50" />
                        <span className="text-4xl font-extrabold text-white tabular-nums leading-none">{filteredStudents.length}</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Estudiantes</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">En tu curso</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                    <div className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-md ${tendencia === "mejorando" ? "bg-emerald-500" : tendencia === "empeorando" ? "bg-rose-500" : "bg-amber-500"}`}>
                        <TrendIcon className="absolute top-2.5 right-2.5 h-4 w-4 text-white/50" />
                        <span className="text-xs font-bold text-white text-center leading-tight px-2">{trendLabel}</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Tendencia</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Clima del aula</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                    <div className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-md ${alertsEnriched.length > 0 ? "bg-rose-500" : "bg-slate-400"}`}>
                        <AlertTriangle className="absolute top-2.5 right-2.5 h-4 w-4 text-white/50" />
                        <span className="text-4xl font-extrabold text-white tabular-nums leading-none">{alertsEnriched.length}</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Alertas</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{alertsEnriched.length > 0 ? "Requieren atención" : "Sin alertas"}</p>
                    </div>
                </div>
            </div>

            {/* Heatmap — rediseñado */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Clima del aula</CardTitle>
                    <CardDescription>Últimas 4 semanas — energía registrada por día</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Cabecera de días */}
                    <div className="grid grid-cols-[32px_repeat(5,1fr)] gap-1.5 mb-1">
                        <div />
                        {DAY_NAMES.map(d => (
                            <div key={d} className="text-center text-[11px] font-medium text-slate-400">{d}</div>
                        ))}
                    </div>

                    {/* Filas por semana */}
                    <div className="space-y-1.5">
                        {WEEK_NAMES.map((week) => (
                            <div key={week} className="grid grid-cols-[32px_repeat(5,1fr)] gap-1.5 items-center">
                                <span className="text-[11px] font-medium text-slate-400">{week}</span>
                                {DAY_NAMES.map((_, di) => {
                                    const cell = heatmapData.find(h => h.week === week && h.dayIndex === di)
                                    const cfg = cell?.energy
                                        ? ENERGY_CONFIG[cell.energy as keyof typeof ENERGY_CONFIG]
                                        : null

                                    return (
                                        <div
                                            key={di}
                                            title={cfg?.label ?? "Sin registro"}
                                            className="group relative h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
                                            style={{
                                                background: cfg
                                                    ? `${cfg.color}18`
                                                    : "#f8fafc",
                                                border: cfg
                                                    ? `1.5px solid ${cfg.color}40`
                                                    : "1.5px solid #e2e8f0",
                                            }}
                                        >
                                            {cfg ? (
                                                <>
                                                    <span className="text-sm leading-none">{cfg.emoji}</span>
                                                    <span
                                                        className="text-[9px] font-semibold leading-none"
                                                        style={{ color: cfg.color }}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-slate-300">—</span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Leyenda */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
                        {Object.entries(ENERGY_CONFIG).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ background: cfg.color }}
                                />
                                <span className="text-xs text-slate-500">{cfg.label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-slate-200" />
                            <span className="text-xs text-slate-400">Sin registro</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Gráfico tendencia */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Tendencia semanal</CardTitle>
                    <CardDescription>Promedio de energía del aula (4 = regulada · 1 = explosiva)</CardDescription>
                </CardHeader>
                <CardContent>
                    {sinDatos ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                            <span className="text-3xl">📭</span>
                            <p className="text-sm">No hay registros suficientes</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={trendColor} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <YAxis domain={[1, 4]} ticks={[1, 2, 3, 4]}
                                    tickFormatter={(v) => (["", "🔥", "😴", "😤", "😊"] as string[])[v] ?? v}
                                    tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    formatter={(value: number | undefined) => {
                                        if (value === undefined) return ["Sin datos", "Clima"]
                                        const map: Record<number, string> = { 1: "Explosiva 🔥", 2: "Apática 😴", 3: "Inquieta 😤", 4: "Regulada 😊" }
                                        return [map[Math.round(value)] ?? value, "Clima"]
                                    }}
                                />
                                <Area type="monotone" dataKey="promedio" stroke={trendColor} strokeWidth={2.5}
                                    fill="url(#colorEnergy)"
                                    dot={{ fill: trendColor, r: 5, strokeWidth: 2, stroke: "#fff" }}
                                    connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Alertas */}
            {alertsEnriched.length > 0 && (
                <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <CardTitle className="text-base text-red-700">
                                Estudiantes que necesitan atención
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {alertsEnriched.map(alert => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                <span className="text-lg mt-0.5">⚠️</span>
                                <div>
                                    <p className="font-medium text-slate-800 text-sm">{alert.studentName}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Lista estudiantes — sin registro emocional (lo maneja la dupla) */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <CardTitle className="text-base">Estudiantes del curso</CardTitle>
                    </div>
                    <CardDescription>Listado de estudiantes a cargo</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No hay estudiantes en este curso</p>
                    ) : (
                        <div className="space-y-2">
                            {filteredStudents.map(student => (
                                <div
                                    key={student.id}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                                        {student.name[0]}{student.last_name[0]}
                                    </div>
                                    <p className="font-medium text-slate-800 text-sm">
                                        {student.name} {student.last_name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}
