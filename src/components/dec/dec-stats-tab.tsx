"use client"

import { useState, useRef } from "react"
import { ChevronDown, ChevronUp, Download } from "lucide-react"
import html2canvas from "html2canvas-pro"
import { toast } from "sonner"
import {
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { DecStatsAiAssistant } from "@/components/dec/dec-stats-ai-assistant"

export interface DecStatsData {
    decsByType: { name: string; count: number; color: string }[]
    decsBySeverity: { name: string; count: number; color: string }[]
    monthlyTrend: { mes: string; decs: number; cierres: number }[]
    topStudentsByDecs: { studentId: string; studentName: string; courseName: string; count: number }[]
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

type DecStatsTabProps = {
    stats: DecStatsData
    institutionName?: string
    institutionLogoUrl?: string | null
}

function ChartCardWithDownload({
    title,
    fileName,
    children,
}: {
    title: string
    fileName: string
    children: React.ReactNode
}) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [downloading, setDownloading] = useState(false)

    async function handleDownloadPng() {
        if (!cardRef.current) return
        setDownloading(true)
        try {
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: "#ffffff",
                logging: false,
            })
            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"))
            if (!blob) {
                toast.error("No se pudo generar la imagen.")
                return
            }
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = fileName
            a.click()
            URL.revokeObjectURL(url)
            toast.success("Gráfico descargado.")
        } catch (e) {
            console.error(e)
            toast.error("No se pudo descargar el gráfico.")
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <button
                type="button"
                onClick={handleDownloadPng}
                disabled={downloading}
                className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                title="Descargar gráfico (PNG)"
                aria-label="Descargar gráfico"
            >
                <Download className="h-4 w-4" />
            </button>
            <div ref={cardRef} className="chart-capture">
                {title ? <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 pr-10">{title}</p> : <div className="mb-3 pr-10" />}
                {children}
            </div>
        </div>
    )
}

export function DecStatsTab({ stats, institutionName = "Institución", institutionLogoUrl }: DecStatsTabProps) {
    const { decsBySeverity, monthlyTrend, topStudentsByDecs, topCourses, topConductTypes, topTriggers, topActions } = stats

    return (
        <div className="space-y-6">
            {/* Cursos con más incidentes DEC + DECs por severidad (uno al lado del otro) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ChartCardWithDownload title="Cursos con más incidentes DEC" fileName="DEC_Cursos_mas_incidentes.png">
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
                </ChartCardWithDownload>

                <ChartCardWithDownload title="DECs por severidad" fileName="DEC_Severidad.png">
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
                </ChartCardWithDownload>
            </div>

            {/* Etiquetas más registradas: conductas, desencadenantes, acciones */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ChartCardWithDownload title="" fileName="DEC_Conductas_observadas.png">
                <TagRankCard
                    title="Conductas observadas más registradas"
                    items={topConductTypes}
                    color="#8b5cf6"
                />
                </ChartCardWithDownload>
                <ChartCardWithDownload title="" fileName="DEC_Situaciones_desencadenantes.png">
                <TagRankCard
                    title="Situaciones desencadenantes más registradas"
                    items={topTriggers}
                    color="#f59e0b"
                />
                </ChartCardWithDownload>
                <ChartCardWithDownload title="" fileName="DEC_Acciones_realizadas.png">
                <TagRankCard
                    title="Acciones realizadas más registradas"
                    items={topActions}
                    color="#10b981"
                />
                </ChartCardWithDownload>
            </div>

            {/* Tendencia mensual */}
            <ChartCardWithDownload title="Tendencia de casos DEC" fileName="DEC_Tendencia_casos.png">
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
            </ChartCardWithDownload>

            {/* Estudiantes con más DEC */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estudiantes con más DEC</p>
                {topStudentsByDecs.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Sin registros en el período.</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {topStudentsByDecs.map((s, i) => (
                            <div key={s.studentId} className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${i === 0 ? "bg-rose-500" : i === 1 ? "bg-orange-400" : "bg-amber-400"}`}>
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-800 truncate">{s.studentName}</p>
                                        <p className="text-[10px] text-slate-400">{s.courseName}</p>
                                    </div>
                                </div>
                                <span className="shrink-0 text-xs font-bold text-slate-800 tabular-nums ml-3">{s.count} DEC{s.count !== 1 ? "s" : ""}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <DecStatsAiAssistant institutionName={institutionName} />
        </div>
    )
}
