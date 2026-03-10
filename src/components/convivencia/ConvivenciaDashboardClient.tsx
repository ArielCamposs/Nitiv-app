"use client"

import Link from "next/link"
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import {
    ShieldAlert, Activity, FileText, Users, TrendingUp,
    TrendingDown, AlertTriangle, BookOpen, ChevronRight,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ConvivenciaStats {
    openDecs: number
    activeAlerts: number
    activePaecs: number
    totalStudents: number
    decsByType: { name: string; count: number; color: string }[]
    decsBySeverity: { name: string; count: number; color: string }[]
    monthlyTrend: { mes: string; decs: number; cierres: number }[]
    recentDecs: { id: string; folio: string; studentName: string; courseName: string; severity: string; type: string; incident_date: string }[]
    resolutionRate: number
    topCourses: { courseName: string; count: number }[]
    totalPeriodDecs: number
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    leve: { label: "Leve", color: "#3b82f6", bg: "bg-blue-500" },
    grave: { label: "Grave", color: "#f97316", bg: "bg-orange-500" },
    muy_grave: { label: "Muy grave", color: "#ef4444", bg: "bg-rose-500" },
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

// ─── Main component ────────────────────────────────────────────────────────────
export function ConvivenciaDashboardClient({ stats }: { stats: ConvivenciaStats }) {
    const { openDecs, activeAlerts, activePaecs, totalStudents,
        decsByType, decsBySeverity, monthlyTrend, recentDecs,
        resolutionRate, topCourses, totalPeriodDecs } = stats

    return (
        <div className="space-y-6">
            {/* ── KPI circles ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    { value: openDecs, label: "DECs abiertos", sub: "Sin resolver", icon: ShieldAlert, color: "bg-rose-500", href: "/convivencia/dec" },
                    { value: activeAlerts, label: "Alertas activas", sub: "Requieren atención", icon: AlertTriangle, color: openDecs > 3 ? "bg-orange-500" : "bg-amber-500", href: undefined },
                    { value: activePaecs, label: "PAECs activos", sub: "Planes de apoyo", icon: FileText, color: "bg-violet-500", href: "/paec" },
                    { value: totalStudents, label: "Estudiantes", sub: "En la institución", icon: Users, color: "bg-indigo-500", href: "/convivencia/estudiantes" },
                ].map(({ value, label, sub, icon: Icon, color, href }) => {
                    const content = (
                        <div key={label} className="flex flex-col items-center text-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5">
                            <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${color} shadow-sm`}>
                                <Icon className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white/50" />
                                <span className="text-2xl font-extrabold text-white tabular-nums leading-none">{value}</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700">{label}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{sub}</p>
                            </div>
                        </div>
                    )
                    return href ? <Link key={label} href={href}>{content}</Link> : content
                })}
            </div>

            {/* ── Tasa de resolución + Top cursos ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tasa de resolución */}
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

                {/* Top cursos con más incidentes */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cursos con más incidentes</p>
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
                        <p className="text-xs text-slate-400 text-center py-4">Sin incidentes en el período 🎉</p>
                    )}
                </div>
            </div>

            {/* ── Row 2: DEC por tipo + DEC por gravedad ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Por tipo */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">DECs por tipo</p>
                    {decsByType.some(d => d.count > 0) ? (
                        <div className="space-y-2">
                            {decsByType.filter(d => d.count > 0).map(d => (
                                <div key={d.name}>
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                        <span className="text-slate-600 truncate">{d.name}</span>
                                        <span className="font-semibold text-slate-800 tabular-nums shrink-0 ml-2">{d.count}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full rounded-full" style={{
                                            width: `${Math.round((d.count / Math.max(...decsByType.map(x => x.count), 1)) * 100)}%`,
                                            background: d.color,
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-4">Sin casos activos 🎉</p>
                    )}
                </div>

                {/* Por gravedad */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">DECs por gravedad</p>
                    {decsBySeverity.some(d => d.count > 0) ? (
                        <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                                <Pie data={decsBySeverity} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="count" strokeWidth={0}>
                                    {decsBySeverity.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col gap-2 py-2">
                            {decsBySeverity.map(d => (
                                <div key={d.name} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                                        <span className="text-slate-600">{d.name}</span>
                                    </div>
                                    <span className="font-semibold text-slate-800">{d.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2">
                        {decsBySeverity.map(d => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                                <span className="text-slate-500">{d.name}: <strong>{d.count}</strong></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Row 3: Tendencia mensual ── */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tendencia de casos — últimos 12 meses</p>
                <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                        <defs>
                            <linearGradient id="gradDecs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="gradCierres" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="decs" stroke="#ef4444" strokeWidth={2} fill="url(#gradDecs)" name="Nuevos DECs" />
                        <Area type="monotone" dataKey="cierres" stroke="#10b981" strokeWidth={2} fill="url(#gradCierres)" name="Cierres" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* ── Row 4: DECs recientes ── */}
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

            {/* ── Quick links ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { href: "/convivencia/dec/nuevo", label: "Nuevo DEC", icon: ShieldAlert, color: "indigo" },
                    { href: "/convivencia/estudiantes", label: "Estudiantes", icon: Users, color: "cyan" },
                    { href: "/convivencia/heatmap", label: "Clima de aula", icon: TrendingUp, color: "emerald" },
                    { href: "/paec", label: "Gestión PAEC", icon: FileText, color: "violet" },
                ].map(({ href, label, icon: Icon, color }) => (
                    <Link key={href} href={href}
                        className={`flex items-center gap-2 rounded-xl border border-${color}-100 bg-${color}-50 px-4 py-3 text-sm font-medium text-${color}-700 hover:bg-${color}-100 transition-colors`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
