"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Legend,
} from "recharts"
import {
    Heart,
    ShieldAlert,
    CalendarCheck,
    AlertTriangle,
    FileCheck,
    FileClock,
} from "lucide-react"
import type { DashboardData } from "@/actions/statistics/getDashboardData"
import { RiskCoursesSection } from "@/components/statistics/RiskCoursesSection"

const EMOTION_LABELS: Record<string, string> = {
    triste: "Triste",
    muy_mal: "Muy mal",
    mal: "Mal",
    neutral: "Neutral",
    bien: "Bien",
    muy_bien: "Muy bien",
}

const EMOTION_COLORS: Record<string, string> = {
    triste: "#dc2626",
    muy_mal: "#ea580c",
    mal: "#ca8a04",
    neutral: "#94a3b8",
    bien: "#22c55e",
    muy_bien: "#16a34a",
}

function formatMonth(key: string) {
    const [y, m] = key.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("es-CL", { month: "short" })
}

type Props = { data: DashboardData; days: number }

export function OverviewSection({ data, days }: Props) {
    const { summary, emotionDistribution, incidents, convivenciaSummary, courseRisks } = data

    const totalActivity =
        (summary.total_emotion_logs || 0) + (summary.total_incidents || 0) + (summary.total_activities || 0)
    const donutData = [
        {
            name: "Reg. emocionales",
            value: summary.total_emotion_logs || 0,
            fill: "#8b5cf6",
        },
        {
            name: "Incidentes DEC",
            value: summary.total_incidents || 0,
            fill: "#f59e0b",
        },
        {
            name: "Actividades",
            value: summary.total_activities || 0,
            fill: "#22c55e",
        },
    ].filter((d) => d.value > 0)

    const emotionBarData = (emotionDistribution || [])
        .map((e) => ({
            name: EMOTION_LABELS[e.emotion] ?? e.emotion,
            count: e.count,
            fill: EMOTION_COLORS[e.emotion] ?? "#94a3b8",
        }))
        .sort((a, b) => b.count - a.count)

    const trendData = (incidents.byMonth || []).map((m) => ({
        mes: formatMonth(m.month),
        incidentes: m.count,
    }))

    const hasConvivencia = convivenciaSummary != null
    const convTotal = hasConvivencia
        ? (convivenciaSummary.open || 0) + (convivenciaSummary.closed || 0)
        : 0

    return (
        <div className="space-y-8">
            {/* KPIs principales */}
            <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Indicadores del periodo</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-200">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-3xl font-bold tabular-nums">{summary.total_emotion_logs ?? 0}</p>
                                    <p className="text-sm font-medium text-violet-100 mt-1">Registros emocionales</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2.5">
                                    <Heart className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-3xl font-bold tabular-nums">{summary.total_incidents ?? 0}</p>
                                    <p className="text-sm font-medium text-amber-100 mt-1">Incidentes DEC</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2.5">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-3xl font-bold tabular-nums">{summary.total_activities ?? 0}</p>
                                    <p className="text-sm font-medium text-emerald-100 mt-1">Actividades</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2.5">
                                    <CalendarCheck className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-0 bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-3xl font-bold tabular-nums">{summary.low_emotion_courses ?? 0}</p>
                                    <p className="text-sm font-medium text-rose-100 mt-1">Cursos en riesgo</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2.5">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Panorama + Emociones + Tendencia */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Dona: actividad del periodo */}
                <Card className="border-slate-200/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Panorama del periodo</CardTitle>
                        <p className="text-xs text-slate-500 font-normal">
                            Registros emocionales, incidentes y actividades
                        </p>
                    </CardHeader>
                    <CardContent className="h-52">
                        {donutData.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">Sin datos en el periodo.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={40}
                                        outerRadius={52}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {donutData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} stroke="white" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string) => [
                                            `${value} (${totalActivity ? ((value / totalActivity) * 100).toFixed(1) : 0}%)`,
                                            name,
                                        ]}
                                    />
                                    <Legend
                                        layout="horizontal"
                                        verticalAlign="bottom"
                                        wrapperStyle={{ fontSize: "12px" }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Barras: distribución emocional */}
                <Card className="border-slate-200/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Clima emocional</CardTitle>
                        <p className="text-xs text-slate-500 font-normal">
                            Distribución de estados registrados
                        </p>
                    </CardHeader>
                    <CardContent className="h-52">
                        {emotionBarData.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">Sin registros emocionales.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={emotionBarData}
                                    layout="vertical"
                                    margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                                    barCategoryGap="20%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={72} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Registros" radius={[0, 4, 4, 0]}>
                                        {emotionBarData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Area: tendencia incidentes */}
                <Card className="border-slate-200/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Tendencia de incidentes</CardTitle>
                        <p className="text-xs text-slate-500 font-normal">
                            Incidentes DEC por mes (últimos {days} días)
                        </p>
                    </CardHeader>
                    <CardContent className="h-52">
                        {trendData.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">Sin incidentes en el periodo.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="incidentes"
                                        name="Incidentes"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        fill="url(#incidentGrad)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Convivencia (dupla/convivencia) */}
            {hasConvivencia && (
                <section>
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">Registros de convivencia</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="rounded-xl bg-amber-100 p-3">
                                    <FileClock className="h-8 w-8 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-amber-700">
                                        {convivenciaSummary.open}
                                    </p>
                                    <p className="text-xs font-medium text-slate-500">Casos abiertos</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="rounded-xl bg-emerald-100 p-3">
                                    <FileCheck className="h-8 w-8 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-emerald-700">
                                        {convivenciaSummary.closed}
                                    </p>
                                    <p className="text-xs font-medium text-slate-500">Casos cerrados</p>
                                </div>
                            </CardContent>
                        </Card>
                        {convTotal > 0 && (
                            <Card className="border-slate-200 bg-slate-50/50">
                                <CardContent className="p-4">
                                    <p className="text-xs font-medium text-slate-500 mb-2">Proporción</p>
                                    <div className="h-3 rounded-full bg-slate-200 overflow-hidden flex">
                                        <div
                                            className="bg-amber-400 transition-all"
                                            style={{
                                                width: `${(convivenciaSummary.open / convTotal) * 100}%`,
                                            }}
                                        />
                                        <div
                                            className="bg-emerald-400 transition-all"
                                            style={{
                                                width: `${(convivenciaSummary.closed / convTotal) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1.5">
                                        Abiertos / Cerrados en el periodo
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </section>
            )}

            {/* Cursos en riesgo */}
            <section>
                <RiskCoursesSection courses={courseRisks} />
            </section>
        </div>
    )
}
