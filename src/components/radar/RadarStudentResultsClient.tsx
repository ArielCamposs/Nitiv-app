"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const AXES = {
    ac: { label: "Autoconciencia",     emoji: "🧠", color: "#db2777" },
    ag: { label: "Autogestión",        emoji: "🎯", color: "#7c3aed" },
    cs: { label: "Conciencia Social",  emoji: "🤝", color: "#d97706" },
    hr: { label: "Hab. Relacionales",  emoji: "💬", color: "#4f46e5" },
    td: { label: "Toma de Decisiones", emoji: "⚖️", color: "#b45309" },
} as const
type AxisKey = keyof typeof AXES
const AXIS_ORDER: AxisKey[] = ["ac", "ag", "cs", "hr", "td"]

export interface StudentResult {
    id: string
    name: string
    completedAt: string
    scores: Partial<Record<AxisKey, number>>
}

const scoreLabel = (s: number) =>
    s >= 4.5 ? "Excelente" : s >= 3.5 ? "Lo hace bien" : s >= 2.5 ? "A veces lo logra" : s >= 1.5 ? "Con dificultad" : "Necesita apoyo"

const scoreColor = (s: number) =>
    s >= 4 ? "#22c55e" : s >= 3 ? "#3b82f6" : s >= 2 ? "#f97316" : "#ef4444"

function MiniScoreBar({ score, color }: { score: number; color: string }) {
    return (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(score / 5) * 100}%`, backgroundColor: color }} />
        </div>
    )
}

function Initials({ name }: { name: string }) {
    const parts = name.trim().split(" ")
    const letters = parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("")
    return (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-600">{letters}</span>
        </div>
    )
}

export function RadarStudentResultsClient({ students }: { students: StudentResult[] }) {
    const [openId, setOpenId] = useState<string | null>(null)

    if (!students.length) {
        return (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-slate-400 text-sm">Aún no hay respuestas para este período.</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {students.map(student => {
                const isOpen = openId === student.id
                const scores = AXIS_ORDER.map(ax => ({ axis: ax, avg: student.scores[ax] ?? null }))
                    .filter(s => s.avg !== null) as { axis: AxisKey; avg: number }[]
                const sorted = [...scores].sort((a, b) => b.avg - a.avg)
                const best = sorted[0]
                const worst = sorted[sorted.length - 1]
                const date = new Date(student.completedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })

                return (
                    <div key={student.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Row — always visible */}
                        <button
                            onClick={() => setOpenId(isOpen ? null : student.id)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Initials name={student.name} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{student.name}</p>
                                    {/* Mini score preview — 5 tiny dots when collapsed */}
                                    {!isOpen && scores.length > 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                            {scores.map(({ axis, avg }) => (
                                                <div
                                                    key={axis}
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: scoreColor(avg) }}
                                                    title={`${AXES[axis].label}: ${avg.toFixed(1)}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-slate-400">{date}</span>
                                <ChevronDown
                                    className="w-4 h-4 text-slate-400 transition-transform"
                                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                                />
                            </div>
                        </button>

                        {/* Expanded detail */}
                        {isOpen && (
                            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">

                                {/* Axis scores */}
                                <div className="space-y-3">
                                    {scores.map(({ axis, avg }) => {
                                        const a = AXES[axis]
                                        const col = scoreColor(avg)
                                        return (
                                            <div key={axis} className="flex items-center gap-3">
                                                <span className="text-base shrink-0">{a.emoji}</span>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between text-[11px] font-semibold">
                                                        <span className="text-slate-500">{a.label}</span>
                                                        <span style={{ color: col }}>{avg.toFixed(1)}/5</span>
                                                    </div>
                                                    <MiniScoreBar score={avg} color={col} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Analysis */}
                                {best && worst && best.axis !== worst.axis && (
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 space-y-1.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Análisis</p>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-sm">💪</span>
                                            <p className="text-xs text-slate-600">
                                                <span className="font-bold text-slate-800">Fortaleza:</span>{" "}
                                                {AXES[best.axis].label} ({best.avg.toFixed(1)}/5) — {scoreLabel(best.avg)}.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-sm">🌱</span>
                                            <p className="text-xs text-slate-600">
                                                <span className="font-bold text-slate-800">A trabajar:</span>{" "}
                                                {AXES[worst.axis].label} ({worst.avg.toFixed(1)}/5) — {scoreLabel(worst.avg)}.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
