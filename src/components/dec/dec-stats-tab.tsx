"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

export interface DecStatsData {
    decsByType: { name: string; count: number; color: string }[]
    decsBySeverity: { name: string; count: number; color: string }[]
    monthlyTrend: { mes: string; decs: number; cierres: number }[]
    recentDecs: { id: string; folio: string; studentName: string; courseName: string; severity: string; type: string; incident_date: string }[]
    resolutionRate: number
    topCourses: { courseName: string; count: number }[]
    totalPeriodDecs: number
    topConductTypes: { name: string; count: number }[]
    topTriggers: { name: string; count: number }[]
    topActions: { name: string; count: number }[]
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
    leve: { label: "Leve", color: "#3b82f6" },
    grave: { label: "Grave", color: "#f97316" },
    muy_grave: { label: "Muy grave", color: "#ef4444" },
}

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-lg text-xs">
            <p className="font-semibold text-slate-700 mb-1">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-medium text-slate-700">{p.value}</span>
                </div>
            ))}
        </div>
    )
}

function TagRankCard({ title, items, color }: { title: string; items: { name: string; count: number }[]; color: string }) {
    const [open, setOpen] = useState(false)
    const top3 = items.slice(0, 3)
    const rest = items.slice(3)
    const maxCount = items.length > 0 ? Math.max(...items.map((i) => i.count), 1) : 1

    function ItemRow({ item }: { item: { name: string; count: number } }) {
        return (
            <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-slate-600 truncate pr-2">{item.name}</span>
                    <span className="font-semibold text-slate-800 tabular-nums shrink-0">{item.count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.round((item.count / maxCount) * 100)}%`, background: color }}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</p>
            {items.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Sin registros en el período</p>
            ) : (
                <div className="space-y-2">
                    {top3.map((item) => (
                        <ItemRow key={item.name} item={item} />
                    ))}
                    {rest.length > 0 && open && (
                        <div className="space-y-2">
                            {rest.map((item) => (
                                <ItemRow key={item.name} item={item} />
                            ))}
                        </div>
                    )}
                    {rest.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            className="flex w-full items-center justify-center gap-1.5 py-2 mt-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                        >
                            {open ? (
                                <>Ver menos <ChevronUp className="h-3.5 w-3.5" /></>
                            ) : (
                                <>Ver más ({rest.length}) <ChevronDown className="h-3.5 w-3.5" /></>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export function DecStatsTab({ stats }: { stats: DecStatsData }) {
    const { decsByType, decsBySeverity, monthlyTrend, recentDecs, resolutionRate, topCourses, totalPeriodDecs, topConductTypes, topTriggers, topActions } = stats

    return (
        <div className="space-y-6">
            {/* Tasa de resolución + Top cursos */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-5">
                    <div
                        className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4"
                        style={{ borderColor: resolutionRate >= 70 ? "#10b981" : resolutionRate >= 40 ? "#f59e0b" : "#ef4444" }}
                    >
                        <span
                            className="text-xl font-extrabold tabular-nums"
                            style={{ color: resolutionRate >= 70 ? "#10b981" : resolutionRate >= 40 ? "#f59e0b" : "#ef4444" }}
                        >
                            {resolutionRate}%
                        </span>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tasa de resolución</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{resolutionRate}%</p>
                        <p className="text-xs text-slate-400 mt-1">{totalPeriodDecs} DECs en 12 meses · {Math.round(totalPeriodDecs * resolutionRate / 100)} resueltos</p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${resolutionRate}%`,
                                    background: resolutionRate >= 70 ? "#10b981" : resolutionRate >= 40 ? "#f59e0b" : "#ef4444"
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cursos con más incidentes DEC</p>
                    {topCourses.length > 0 ? (
                        <div className="space-y-2.5">
                            {topCourses.map((c, i) => (
                                <div key={c.courseName}>
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white ${i === 0 ? "bg-rose-500" : i === 1 ? "bg-orange-400" : "bg-amber-400"}`}>{i + 1}</span>
                                            <span className="text-slate-700 font-medium">{c.courseName}</span>
                                        </div>
                                        <span className="font-bold text-slate-800 tabular-nums">{c.count}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full rounded-full bg-rose-400"
                                            style={{ width: `${Math.round((c.count / (topCourses[0]?.count ?? 1)) * 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-4">Sin incidentes en el período</p>
                    )}
                </div>
            </div>

            {/* DEC por severidad + DEC por tipo (ambos con torta y colores que los representan) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">DECs por severidad</p>
                    {decsBySeverity.some(d => d.count > 0) ? (
                        <>
                            <ResponsiveContainer width="100%" height={150}>
                                <PieChart>
                                    <Pie
                                        data={decsBySeverity.filter(d => d.count > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={38}
                                        outerRadius={62}
                                        dataKey="count"
                                        nameKey="name"
                                        strokeWidth={0}
                                    >
                                        {decsBySeverity.filter(d => d.count > 0).map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-3 mt-2 justify-center">
                                {decsBySeverity.map(d => (
                                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                                        <span className="text-slate-500">{d.name}: <strong>{d.count}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-4">Sin casos en el período</p>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">DECs por tipo</p>
                    {decsByType.some(d => d.count > 0) ? (
                        <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                                <Pie data={decsByType.filter(d => d.count > 0)} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="count" nameKey="name" strokeWidth={0}>
                                    {decsByType.filter(d => d.count > 0).map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-4">Sin casos en el período</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2">
                        {decsByType.filter(d => d.count > 0).map(d => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                                <span className="text-slate-500 truncate max-w-[120px]" title={d.name}>{d.name}: <strong>{d.count}</strong></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Etiquetas más registradas: conductas, desencadenantes, acciones */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TagRankCard
                    title="Conductas observadas más registradas"
                    items={topConductTypes}
                    color="#8b5cf6"
                />
                <TagRankCard
                    title="Situaciones desencadenantes más registradas"
                    items={topTriggers}
                    color="#f59e0b"
                />
                <TagRankCard
                    title="Acciones realizadas más registradas"
                    items={topActions}
                    color="#10b981"
                />
            </div>

            {/* Tendencia mensual */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tendencia de casos DEC</p>
                <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                        <defs>
                            <linearGradient id="decStatsGradDecs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="decStatsGradCierres" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="decs" stroke="#ef4444" strokeWidth={2} fill="url(#decStatsGradDecs)" name="Nuevos DECs" />
                        <Area type="monotone" dataKey="cierres" stroke="#10b981" strokeWidth={2} fill="url(#decStatsGradCierres)" name="Cierres" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* DECs recientes sin resolver */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">DECs recientes sin resolver</p>
                    <Link href="/convivencia/dec" className="text-[10px] text-indigo-600 hover:underline font-medium">Ver todos →</Link>
                </div>
                {recentDecs.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Sin casos activos.</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {recentDecs.map(d => {
                            const cfg = SEVERITY_CONFIG[d.severity] ?? { label: d.severity, color: "#94a3b8" }
                            return (
                                <div key={d.id} className="flex items-center justify-between py-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-800 truncate">{d.studentName}</p>
                                        <p className="text-[10px] text-slate-400">{d.courseName} · {d.type} · Folio {d.folio}</p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 ml-3">
                                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ background: cfg.color }}>
                                            {cfg.label}
                                        </span>
                                        <span className="text-[9px] text-slate-400 mt-0.5">
                                            {new Date(d.incident_date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
