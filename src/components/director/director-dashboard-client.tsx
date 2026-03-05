"use client"

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, AlertTriangle, FileText, ClipboardList } from "lucide-react"

const SEVERITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    leve: { label: "Leve", color: "text-yellow-600", dot: "bg-yellow-400" },
    grave: { label: "Grave", color: "text-orange-600", dot: "bg-orange-400" },
    muy_grave: { label: "Muy grave", color: "text-red-600", dot: "bg-red-500" },
}

const CLIMATE_COLOR = (score: number | null) =>
    score === null ? "#e2e8f0" :
        score >= 3.5 ? "#10b981" :
            score >= 2.5 ? "#f59e0b" :
                score >= 1.5 ? "#9ca3af" : "#ef4444"

interface MesData { mes: string; total: number; negativos: number; pct: number }
interface ClimateData { courseId: string; courseName: string; promedio: number | null; label: string; registros: number }
interface AlertData { id: string; student_id: string; type: string; description: string | null; studentName: string; courseName: string; created_at: string }
interface IncidentData { id: string; folio: string | null; severity: string; type: string; studentName: string; incident_date: string }

interface Props {
    totalStudents: number
    totalAlerts: number
    totalIncidents: number
    paecPendingReview: number
    climatePorCurso: ClimateData[]
    mesesData: MesData[]
    alertsEnriched: AlertData[]
    incidentsEnriched: IncidentData[]
    bienestarPromedio: number | null
}

function StatCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: number | string; color: string
}) {
    return (
        <div className="flex flex-col items-center text-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 group">
            <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${color} shadow-sm`}>
                <Icon className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white/50" />
                <span className="text-2xl font-extrabold text-white tabular-nums leading-none">{value}</span>
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-700">{label}</p>
            </div>
        </div>
    )
}

export function DirectorDashboardClient({
    totalStudents, totalAlerts, totalIncidents, paecPendingReview,
    climatePorCurso, mesesData, alertsEnriched, incidentsEnriched, bienestarPromedio,
}: Props) {

    const bienestarLabel =
        bienestarPromedio === null ? "Sin datos" :
            bienestarPromedio >= 4 ? "Muy bueno 🤩" :
                bienestarPromedio >= 3 ? "Bueno 🙂" :
                    bienestarPromedio >= 2 ? "Regular 😐" : "Crítico ⚠️"

    const bienestarColor =
        bienestarPromedio === null ? "text-slate-400" :
            bienestarPromedio >= 4 ? "text-emerald-600" :
                bienestarPromedio >= 3 ? "text-blue-600" :
                    bienestarPromedio >= 2 ? "text-amber-600" : "text-red-600"

    return (
        <div className="space-y-6">

            {/* ── Tarjetas resumen ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Estudiantes activos" value={totalStudents} color="bg-indigo-500" />
                <StatCard icon={AlertTriangle} label="Alertas sin resolver" value={totalAlerts} color={totalAlerts > 0 ? "bg-rose-500" : "bg-slate-400"} />
                <StatCard icon={FileText} label="DEC pendientes" value={totalIncidents} color={totalIncidents > 0 ? "bg-orange-500" : "bg-slate-400"} />
                <StatCard icon={ClipboardList} label="PAEC por revisar" value={paecPendingReview} color={paecPendingReview > 0 ? "bg-amber-500" : "bg-slate-400"} />
            </div>

            {/* ── Bienestar institucional ── */}
            {bienestarPromedio !== null && (
                <Card className="border-0 shadow-sm bg-linear-to-r from-slate-50 to-slate-100">
                    <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Bienestar institucional promedio</p>
                            <p className="text-xs text-slate-400">Últimas 4 semanas</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-3xl font-bold ${bienestarColor}`}>{bienestarPromedio}/5</p>
                            <p className={`text-sm font-medium ${bienestarColor}`}>{bienestarLabel}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Clima por curso ── */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Clima por curso</CardTitle>
                    <CardDescription>Promedio de energía según registros docentes (últimas 4 semanas)</CardDescription>
                </CardHeader>
                <CardContent>
                    {climatePorCurso.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No hay cursos activos</p>
                    ) : (
                        <div className="space-y-2">
                            {climatePorCurso.map(c => (
                                <div key={c.courseId} className="flex items-center gap-3">
                                    <p className="text-sm font-medium text-slate-700 w-32 shrink-0 truncate">
                                        {c.courseName}
                                    </p>
                                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-3 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${((c.promedio ?? 0) / 4) * 100}%`,
                                                backgroundColor: CLIMATE_COLOR(c.promedio),
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500 w-28 shrink-0">{c.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Meses críticos ── */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Registros negativos por mes</CardTitle>
                    <CardDescription>% de registros emocionales negativos (mal + muy mal) — últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                    {mesesData.every(m => m.total === 0) ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                            <span className="text-3xl">📭</span>
                            <p className="text-sm">No hay registros emocionales aún</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={mesesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <Tooltip
                                    formatter={(value: any, name: any) => [
                                        name === "pct" ? `${value}% negativos` : value,
                                        name === "pct" ? "Negativos" : "Total registros",
                                    ]}
                                />
                                <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                    {mesesData.map((m, i) => (
                                        <Cell
                                            key={i}
                                            fill={m.pct >= 50 ? "#ef4444" : m.pct >= 30 ? "#f97316" : m.pct >= 15 ? "#eab308" : "#10b981"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    <div className="flex gap-4 mt-2 flex-wrap">
                        {[
                            { color: "bg-red-500", label: "Crítico ≥50%" },
                            { color: "bg-orange-500", label: "Alto ≥30%" },
                            { color: "bg-yellow-500", label: "Moderado ≥15%" },
                            { color: "bg-emerald-500", label: "Bueno <15%" },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-1.5">
                                <span className={`w-3 h-3 rounded-sm ${l.color}`} />
                                <span className="text-xs text-slate-400">{l.label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── Alertas activas ── */}
            {alertsEnriched.length > 0 && (
                <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <CardTitle className="text-base text-red-700">Alertas prioritarias</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {alertsEnriched.map(alert => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                <span className="text-lg mt-0.5">⚠️</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-slate-800 text-sm">{alert.studentName}</p>
                                        <span className="text-xs text-slate-400 shrink-0 ml-2">{alert.courseName}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{alert.description}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* ── DEC pendientes ── */}
            {incidentsEnriched.length > 0 && (
                <Card className="border-0 shadow-sm border-l-4 border-l-orange-400">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-500" />
                            <CardTitle className="text-base text-orange-700">DEC pendientes de resolución</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {incidentsEnriched.map(inc => {
                            const sev = SEVERITY_CONFIG[inc.severity] ?? { label: inc.severity, color: "text-slate-600", dot: "bg-slate-400" }
                            return (
                                <div key={inc.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${sev.dot}`} />
                                        <div>
                                            <p className="font-medium text-slate-800 text-sm">{inc.studentName}</p>
                                            <p className="text-xs text-slate-500">
                                                {inc.folio ?? "Sin folio"} · {inc.type}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-medium shrink-0 ${sev.color}`}>
                                        {sev.label}
                                    </span>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

            {/* ── Sin problemas ── */}
            {totalAlerts === 0 && totalIncidents === 0 && paecPendingReview === 0 && (
                <Card className="border-0 shadow-sm bg-emerald-50">
                    <CardContent className="flex flex-col items-center gap-2 py-8">
                        <span className="text-4xl">🎉</span>
                        <p className="font-semibold text-emerald-800">Todo bajo control</p>
                        <p className="text-emerald-600 text-sm">No hay alertas ni casos pendientes</p>
                    </CardContent>
                </Card>
            )}

        </div>
    )
}
