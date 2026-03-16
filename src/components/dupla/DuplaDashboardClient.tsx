"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import {
    Users, AlertTriangle, TrendingUp,
    TrendingDown, MessageSquare, BookOpen, ThermometerSun,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface DuplaStats {
    totalStudents: number
    activeAlerts: number
    helpRequests: number
    checkinsThisWeek: number
    emotionDistribution: { name: string; value: number; color: string }[]
    weeklyTrend: { day: string; muy_bien: number; bien: number; neutral: number; mal: number; muy_mal: number }[]
    climatePorCurso: { curso: string; score: number; label: string }[]
    alertsByType: { name: string; count: number; color: string }[]
    bienestarPromedio: number | null
    recentAlerts: { id: string; studentName: string; courseName: string; type: string; created_at: string }[]
    participationRate: number
    studentsWithoutCheckin: number
}

const EMOTION_COLORS: Record<string, string> = {
    muy_bien: "#10b981",
    bien: "#34d399",
    neutral: "#94a3b8",
    mal: "#f97316",
    muy_mal: "#ef4444",
}

const EMOTION_LABELS: Record<string, string> = {
    muy_bien: "Muy bien", bien: "Bien", neutral: "Neutral", mal: "Mal", muy_mal: "Muy mal",
}

const ALERT_TYPE_LABELS: Record<string, string> = {
    registros_negativos: "Emoc. negativa",
    discrepancia_docente: "Discrepancia",
    sin_registro: "Sin registro",
    comportamiento: "Conducta",
    otro: "Otro",
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
    label, value, sub, icon: Icon, color, href,
}: {
    label: string; value: string | number; sub: string
    icon: React.ElementType; color: string; href?: string
}) {
    const content = (
        <div className="flex flex-col items-center text-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 group">
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
    return href ? <Link href={href}>{content}</Link> : content
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────────
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
export function DuplaDashboardClient({ stats }: { stats: DuplaStats }) {
    const {
        totalStudents, activeAlerts, helpRequests, checkinsThisWeek,
        emotionDistribution, weeklyTrend, climatePorCurso, alertsByType,
        bienestarPromedio, recentAlerts, participationRate, studentsWithoutCheckin,
    } = stats

    const bienestarColor =
        bienestarPromedio === null ? "text-slate-400"
            : bienestarPromedio >= 4 ? "text-emerald-600"
                : bienestarPromedio >= 3 ? "text-amber-600"
                    : "text-rose-600"

    const alertTypesSorted = [...alertsByType].sort((a, b) => b.count - a.count)

    return (
        <div className="space-y-6">
            {/* ── KPI cards ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard
                    label="Estudiantes"
                    value={totalStudents}
                    sub="Activos en la institución"
                    icon={Users}
                    color="bg-indigo-500"
                    href="/dupla/estudiantes"
                />
                <KpiCard
                    label="Alertas activas"
                    value={activeAlerts}
                    sub={activeAlerts > 0 ? "Requieren atención" : "Sin alertas pendientes"}
                    icon={AlertTriangle}
                    color={activeAlerts > 3 ? "bg-rose-500" : "bg-amber-500"}
                />
                <KpiCard
                    label="Solicitudes de ayuda"
                    value={helpRequests}
                    sub="Pendientes de respuesta"
                    icon={MessageSquare}
                    color="bg-violet-500"
                />
                <KpiCard
                    label="Check-ins semana"
                    value={checkinsThisWeek}
                    sub={`${participationRate}% participación`}
                    icon={Users}
                    color="bg-emerald-500"
                />
            </div>

            {/* ── Row 2: Bienestar + Distribución emocional ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Bienestar promedio */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bienestar promedio 30 días</p>
                    <p className={`text-5xl font-extrabold tabular-nums ${bienestarColor}`}>
                        {bienestarPromedio !== null ? bienestarPromedio.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-slate-400">Escala 1–5</p>
                    {bienestarPromedio !== null && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                            {bienestarPromedio >= 3.5
                                ? <><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> <span className="text-emerald-600">Bienestar positivo</span></>
                                : <><TrendingDown className="h-3.5 w-3.5 text-rose-500" /> <span className="text-rose-600">Bajo bienestar</span></>
                            }
                        </div>
                    )}
                    <div className="mt-2 w-full pt-2 border-t border-slate-100 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Sin registro esta semana</span>
                            <span className={`font-bold ${studentsWithoutCheckin > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                {studentsWithoutCheckin} alumnos
                            </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-emerald-400 transition-all"
                                style={{ width: `${participationRate}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Distribución emocional (Pie) */}
                <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Distribución emocional — últimos 30 días</p>
                    {emotionDistribution.some(e => e.value > 0) ? (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                    <Pie data={emotionDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                                        dataKey="value" strokeWidth={0}>
                                        {emotionDistribution.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-1.5 flex-1">
                                {emotionDistribution.filter(e => e.value > 0).map(e => (
                                    <div key={e.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                                            <span className="text-slate-600">{e.name}</span>
                                        </div>
                                        <span className="font-semibold text-slate-800 tabular-nums">{e.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-28 items-center justify-center text-xs text-slate-400">Sin registros esta semana</div>
                    )}
                </div>
            </div>

            {/* ── Row 3: Tendencia semanal + Clima de aula ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tendencia 7 días */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tendencia check-ins — últimas 4 semanas</p>
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={weeklyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="muy_bien" stroke="#10b981" strokeWidth={2} dot={false} name="Muy Bien" />
                            <Line type="monotone" dataKey="bien" stroke="#34d399" strokeWidth={2} dot={false} name="Bien" />
                            <Line type="monotone" dataKey="neutral" stroke="#94a3b8" strokeWidth={2} dot={false} name="Neutral" />
                            <Line type="monotone" dataKey="mal" stroke="#f97316" strokeWidth={2} dot={false} name="Mal" />
                            <Line type="monotone" dataKey="muy_mal" stroke="#ef4444" strokeWidth={2} dot={false} name="Muy Mal" />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Muy Bien
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#34d399]" /> Bien
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" /> Neutral
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> Mal
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Muy Mal
                        </div>
                    </div>
                </div>

                {/* Clima por curso */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Clima de aula por curso — últimos 28 días</p>
                    {climatePorCurso.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(160, climatePorCurso.length * 28)}>
                            <BarChart
                                data={climatePorCurso}
                                layout="vertical"
                                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                            >
                                <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                                <YAxis type="category" dataKey="curso" tick={{ fontSize: 9, fill: "#64748b" }} width={52} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="score" name="Prom. clima" radius={[0, 4, 4, 0]}>
                                    {climatePorCurso.map((entry, i) => (
                                        <Cell key={i}
                                            fill={entry.score >= 3.5 ? "#10b981"
                                                : entry.score >= 2.5 ? "#f59e0b"
                                                    : "#ef4444"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-36 items-center justify-center text-xs text-slate-400">Sin registros de docentes</div>
                    )}
                </div>
            </div>

            {/* ── Row 4: Alertas por tipo + Alertas recientes ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Alertas por tipo (bar) */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Alertas por tipo</p>
                    {alertTypesSorted.some(a => a.count > 0) ? (
                        <div className="space-y-2">
                            {alertTypesSorted.filter(a => a.count > 0).map(a => (
                                <div key={a.name}>
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                        <span className="text-slate-600 truncate">{a.name}</span>
                                        <span className="font-semibold text-slate-800 tabular-nums shrink-0 ml-2">{a.count}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full rounded-full" style={{
                                            width: `${Math.round((a.count / Math.max(...alertTypesSorted.map(x => x.count), 1)) * 100)}%`,
                                            background: a.color,
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-4">Sin alertas activas 🎉</p>
                    )}
                </div>

                {/* Alertas recientes */}
                <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alertas recientes</p>
                        <Link href="/dupla/estudiantes" className="text-[10px] text-indigo-600 hover:underline font-medium">Ver todas →</Link>
                    </div>
                    {recentAlerts.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">Sin alertas activas</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {recentAlerts.slice(0, 5).map(a => (
                                <div key={a.id} className="flex items-center justify-between py-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-800 truncate">{a.studentName}</p>
                                        <p className="text-[10px] text-slate-400">{a.courseName}</p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 ml-3">
                                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                                            {ALERT_TYPE_LABELS[a.type] ?? a.type}
                                        </span>
                                        <span className="text-[9px] text-slate-400 mt-0.5">
                                            {new Date(a.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Quick links ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { href: "/dupla/estudiantes", label: "Estudiantes", icon: Users, color: "indigo" },
                    { href: "/dupla/heatmap", label: "Mapa de clima", icon: ThermometerSun, color: "emerald" },
                    { href: "/dupla/dec", label: "Registros DEC", icon: BookOpen, color: "violet" },
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
