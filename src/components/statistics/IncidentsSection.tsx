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
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts"
import { ShieldAlert, AlertTriangle, TrendingUp, Users, FileWarning } from "lucide-react"

type CountByLabel = { label: string; count: number }
type IncidentByMonth = { month: string; count: number }

type Props = {
    incidents: {
        byMonth: IncidentByMonth[]
        bySeverity: CountByLabel[]
        byType: CountByLabel[]
        byCourse?: CountByLabel[]
        recent: {
            id: string
            folio: string | null
            type: string
            severity: string
            course_name: string | null
            student_name?: string
            incident_date: string
        }[]
    }
    days: number
}

const SEVERITY_LABELS: Record<string, string> = {
    moderada: "Moderada",
    severa: "Severa",
}

const SEVERITY_COLORS: Record<string, string> = {
    moderada: "#f59e0b",
    severa: "#dc2626",
}

const TYPE_LABELS: Record<string, string> = {
    DEC: "DEC",
    agresion_fisica: "Agresion fisica",
    agresion_verbal: "Agresion verbal",
    bullyng: "Bullying",
    acoso: "Acoso",
    consumo: "Consumo",
}

const TYPE_COLORS = ["#6366f1", "#ec4899", "#f97316", "#8b5cf6", "#14b8a6", "#eab308"]

function formatMonth(key: string) {
    const [year, month] = key.split("-").map(Number)
    const d = new Date(year, month - 1, 1)
    return d.toLocaleDateString("es-CL", { month: "short" })
}

export function IncidentsSection({ incidents, days }: Props) {
    const total = incidents.byMonth.reduce((s, m) => s + m.count, 0)
        || incidents.bySeverity.reduce((s, x) => s + x.count, 0)
        || incidents.byType.reduce((s, x) => s + x.count, 0)
    const severos = incidents.bySeverity.find((s) => s.label === "severa")?.count ?? 0
    const moderados = incidents.bySeverity.find((s) => s.label === "moderada")?.count ?? 0
    const topType = incidents.byType.length > 0
        ? incidents.byType.reduce((a, b) => (a.count >= b.count ? a : b))
        : null
    const topCourse = (incidents.byCourse ?? [])[0] ?? null

    const byMonthData = incidents.byMonth.map((m) => ({
        ...m,
        label: formatMonth(m.month),
    }))

    const severityPieData = incidents.bySeverity.map((s) => ({
        name: SEVERITY_LABELS[s.label] ?? s.label,
        value: s.count,
        fill: SEVERITY_COLORS[s.label] ?? "#94a3b8",
    })).filter((d) => d.value > 0)

    const byTypeData = [...(incidents.byType || [])]
        .sort((a, b) => b.count - a.count)
        .map((t, i) => ({
            name: TYPE_LABELS[t.label] ?? t.label,
            count: t.count,
            fill: TYPE_COLORS[i % TYPE_COLORS.length],
        }))

    const byCourseList = incidents.byCourse ?? []
    const hasByCourse = byCourseList.length > 0
    const hasRecent = Array.isArray(incidents.recent) && incidents.recent.length > 0

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <ShieldAlert className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Total incidentes</p>
                            <p className="text-xl font-bold text-slate-800">{total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Severos</p>
                            <p className="text-xl font-bold text-slate-800">{severos}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Tipo mas frecuente</p>
                            <p className="text-sm font-bold text-slate-800 truncate" title={topType ? TYPE_LABELS[topType.label] ?? topType.label : ""}>
                                {topType ? `${TYPE_LABELS[topType.label] ?? topType.label} (${topType.count})` : "—"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center">
                            <Users className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Curso con mas casos</p>
                            <p className="text-sm font-bold text-slate-800 truncate" title={topCourse?.label ?? ""}>
                                {topCourse ? `${topCourse.label} (${topCourse.count})` : "—"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Evolucion por mes + Severidad */}
            <div className="grid lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm">Evolucion por mes</CardTitle>
                        <p className="text-xs text-slate-500 font-normal">Ultimos {days} dias</p>
                    </CardHeader>
                    <CardContent className="h-64">
                        {byMonthData.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">
                                No hay incidentes en el periodo seleccionado.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byMonthData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Incidentes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Por severidad</CardTitle>
                        <p className="text-xs text-slate-500 font-normal">Moderada vs Severa</p>
                    </CardHeader>
                    <CardContent className="h-64">
                        {severityPieData.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">
                                Sin datos de severidad en el periodo.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={severityPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={65}
                                        paddingAngle={2}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {severityPieData.map((_, i) => (
                                            <Cell key={i} fill={severityPieData[i].fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [value, "Incidentes"]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Por tipo (horizontal bars, ordenado) + Por curso */}
            <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Distribucion por tipo</CardTitle>
                        <p className="text-xs text-slate-500 font-normal">Tipos de incidente en el periodo</p>
                    </CardHeader>
                    <CardContent className="h-72">
                        {byTypeData.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">
                                No hay incidentes por tipo en el periodo.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={byTypeData}
                                    layout="vertical"
                                    margin={{ top: 4, right: 10, left: 4, bottom: 4 }}
                                    barCategoryGap="14%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Cantidad" radius={[0, 4, 4, 0]}>
                                        {byTypeData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {hasByCourse && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Incidentes por curso</CardTitle>
                            <p className="text-xs text-slate-500 font-normal">Cursos con mas casos</p>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 max-h-72 overflow-y-auto">
                                {byCourseList.slice(0, 10).map((c) => (
                                    <li key={c.label} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate text-slate-700">{c.label}</span>
                                        <span className="font-semibold text-rose-600 shrink-0">{c.count}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Ultimos incidentes */}
            {hasRecent && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <FileWarning className="h-4 w-4 text-slate-500" />
                            Ultimos incidentes registrados
                        </CardTitle>
                        <p className="text-xs text-slate-500 font-normal">Ordenados por fecha</p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-slate-500 font-medium">
                                        <th className="pb-2 pr-2">Folio / Ref</th>
                                        <th className="pb-2 pr-2">Tipo</th>
                                        <th className="pb-2 pr-2">Severidad</th>
                                        <th className="pb-2 pr-2">Curso</th>
                                        <th className="pb-2">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incidents.recent.map((inc) => (
                                        <tr key={inc.id} className="border-b border-slate-100">
                                            <td className="py-2 pr-2 font-mono text-xs text-slate-600">
                                                {inc.folio ?? inc.id.slice(0, 8)}
                                            </td>
                                            <td className="py-2 pr-2 text-slate-700">
                                                {TYPE_LABELS[inc.type] ?? inc.type}
                                            </td>
                                            <td className="py-2 pr-2">
                                                <span
                                                    className={
                                                        inc.severity === "severa"
                                                            ? "text-rose-600 font-medium"
                                                            : "text-amber-600"
                                                    }
                                                >
                                                    {SEVERITY_LABELS[inc.severity] ?? inc.severity}
                                                </span>
                                            </td>
                                            <td className="py-2 pr-2 text-slate-600">{inc.course_name ?? "—"}</td>
                                            <td className="py-2 text-slate-500">
                                                {new Date(inc.incident_date).toLocaleDateString("es-CL", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "2-digit",
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
