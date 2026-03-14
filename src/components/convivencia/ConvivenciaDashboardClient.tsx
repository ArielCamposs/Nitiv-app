"use client"

import Link from "next/link"
import {
    ShieldAlert, FileText, Users, TrendingUp, AlertTriangle, ChevronRight,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ConvivenciaStats {
    openDecs: number
    activeAlerts: number
    activeConvivenciaRecords: number
    lowestClimateCourse: { courseName: string; score: number; label: string } | null
    decSummary: { total: number; resolved: number }
    convivenciaSummary: { total: number; closed: number }
    climateSummary: { coursesWithData: number }
}

// ─── Main component ────────────────────────────────────────────────────────────
export function ConvivenciaDashboardClient({ stats }: { stats: ConvivenciaStats }) {
    const { openDecs, activeAlerts, activeConvivenciaRecords, lowestClimateCourse, decSummary, convivenciaSummary, climateSummary } = stats

    return (
        <div className="space-y-6">
            {/* ── KPI circles ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    { value: openDecs, label: "DECs abiertos", sub: "Sin resolver", icon: ShieldAlert, color: "bg-rose-500", href: "/convivencia/dec" },
                    { value: activeAlerts, label: "Alertas activas", sub: "Requieren atención", icon: AlertTriangle, color: openDecs > 3 ? "bg-orange-500" : "bg-amber-500", href: undefined },
                    { value: activeConvivenciaRecords, label: "Registros de convivencia activos", sub: "Reg. abiertos", icon: FileText, color: "bg-violet-500", href: "/registros-convivencia" },
                    { value: 0, label: "Curso con clima más bajo", sub: lowestClimateCourse ? `${lowestClimateCourse.courseName} · ${lowestClimateCourse.label}` : "Sin datos", icon: TrendingUp, color: "bg-indigo-500", href: "/convivencia/heatmap", isLowestClimateCard: true, lowestClimateScore: lowestClimateCourse?.score ?? null },
                ].map((item) => {
                    const { value, label, sub, icon: Icon, color, href, isLowestClimateCard, lowestClimateScore } = item
                    const suffix = "suffix" in item ? (item as { suffix?: string }).suffix : undefined
                    const circleText = isLowestClimateCard
                        ? (lowestClimateScore != null ? String(lowestClimateScore) : "—")
                        : `${value}${suffix ?? ""}`
                    const content = (
                        <div key={label} className="flex flex-col items-center text-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5">
                            <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${color} shadow-sm`}>
                                <Icon className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white/50" />
                                <span className="text-2xl font-extrabold text-white tabular-nums leading-none">{circleText}</span>
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

            {/* ── Resumen por área (lo más importante al entrar) ── */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumen por área — últimos 12 meses</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Link
                        href="/convivencia/dec"
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-rose-50/50 px-4 py-3 hover:bg-rose-50 transition-colors group"
                    >
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-600">DEC</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">
                                {openDecs} abiertos · {decSummary.resolved} resueltos
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{decSummary.total} casos en total</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-rose-500 shrink-0 ml-2" />
                    </Link>
                    <Link
                        href="/registros-convivencia"
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-violet-50/50 px-4 py-3 hover:bg-violet-50 transition-colors group"
                    >
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-600">Reg. convivencia</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">
                                {activeConvivenciaRecords} abiertos · {convivenciaSummary.closed} cerrados
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{convivenciaSummary.total} registros en total</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-violet-500 shrink-0 ml-2" />
                    </Link>
                    <Link
                        href="/convivencia/heatmap"
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-indigo-50/50 px-4 py-3 hover:bg-indigo-50 transition-colors group"
                    >
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-600">Clima de aula</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">
                                {lowestClimateCourse ? lowestClimateCourse.courseName : "—"}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {lowestClimateCourse ? `Más bajo · ${climateSummary.coursesWithData} cursos con registro` : `${climateSummary.coursesWithData} cursos con registro`}
                            </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 shrink-0 ml-2" />
                    </Link>
                </div>
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
