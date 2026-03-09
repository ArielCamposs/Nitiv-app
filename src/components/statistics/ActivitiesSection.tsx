"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell,
} from "recharts"
import { CalendarCheck, Layers, TrendingUp, BookOpen } from "lucide-react"

type CountByLabel = { label: string; count: number }
type ActivitiesByMonth = { month: string; count: number }

type Props = {
    activities: {
        byMonth: ActivitiesByMonth[]
        byType: CountByLabel[]
        byCourse: CountByLabel[]
        recent: {
            id: string
            title: string
            start_datetime: string
            activity_type?: string
        }[]
    }
}

const TYPE_LABELS: Record<string, string> = {
    taller: "Taller",
    charla: "Charla",
    evento: "Evento",
    ceremonia: "Ceremonia",
    deportivo: "Deportivo",
    otro: "Otro",
}

const CHART_COLORS = ["#22c55e", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"]

function formatMonth(key: string) {
    const [year, month] = key.split("-").map(Number)
    const d = new Date(year, month - 1, 1)
    return d.toLocaleDateString("es-CL", { month: "short" })
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "short",
        year: "2-digit",
    })
}

export function ActivitiesSection({ activities }: Props) {
    const total = activities.byMonth.reduce((s, m) => s + m.count, 0) || activities.byType.reduce((s, t) => s + t.count, 0)
    const topType = activities.byType.length > 0
        ? activities.byType.reduce((a, b) => (a.count >= b.count ? a : b))
        : null
    const byMonthData = activities.byMonth.map((m) => ({
        ...m,
        label: formatMonth(m.month),
    }))
    const byTypeWithColors = (activities.byType || []).map((t, i) => ({
        name: TYPE_LABELS[t.label] ?? t.label,
        count: t.count,
        fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
    const hasByCourse = Array.isArray(activities.byCourse) && activities.byCourse.length > 0
    const hasRecent = Array.isArray(activities.recent) && activities.recent.length > 0

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <CalendarCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Total (periodo)</p>
                            <p className="text-xl font-bold text-slate-800">{total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-sky-50 to-white border-sky-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
                            <Layers className="h-5 w-5 text-sky-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Tipo mas frecuente</p>
                            <p className="text-sm font-bold text-slate-800 truncate" title={topType ? TYPE_LABELS[topType.label] ?? topType.label : ""}>
                                {topType ? `${TYPE_LABELS[topType.label] ?? topType.label} (${topType.count})` : "—"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Meses con datos</p>
                            <p className="text-xl font-bold text-slate-800">{activities.byMonth.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Cursos con actividades</p>
                            <p className="text-xl font-bold text-slate-800">{hasByCourse ? activities.byCourse.length : 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                {/* Line by month */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm">Actividades por mes</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        {byMonthData.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">
                                No hay actividades en el periodo seleccionado.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={byMonthData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#0ea5e9"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Bar by type */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Por tipo</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        {byTypeWithColors.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">
                                Sin datos de tipo de actividad en el periodo.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byTypeWithColors} margin={{ top: 10, right: 10, left: -20 }} layout="vertical" barCategoryGap="12%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                                    <Tooltip />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {byTypeWithColors.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* By course + Recent in one row */}
            <div className="grid lg:grid-cols-2 gap-4">
                {hasByCourse && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Actividades por curso</CardTitle>
                            <p className="text-xs text-slate-500 font-normal">Vinculaciones en el periodo</p>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 max-h-56 overflow-y-auto">
                                {activities.byCourse.slice(0, 10).map((c, i) => (
                                    <li key={c.label} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate text-slate-700">{c.label}</span>
                                        <span className="font-semibold text-emerald-600 shrink-0">{c.count}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                {hasRecent && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Ultimas actividades</CardTitle>
                            <p className="text-xs text-slate-500 font-normal">Recientes en el periodo</p>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 max-h-56 overflow-y-auto">
                                {activities.recent.slice(0, 5).map((a) => (
                                    <li key={a.id} className="text-sm">
                                        <p className="font-medium text-slate-800 truncate" title={a.title}>{a.title}</p>
                                        <p className="text-xs text-slate-500">
                                            {formatDate(a.start_datetime)}
                                            {a.activity_type && (
                                                <span className="ml-1 text-emerald-600">
                                                    · {TYPE_LABELS[a.activity_type] ?? a.activity_type}
                                                </span>
                                            )}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
