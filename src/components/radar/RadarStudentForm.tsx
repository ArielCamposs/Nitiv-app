"use client"

import { useState, useTransition, useRef } from "react"
import { submitRadarResponse } from "@/actions/radar"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"

type AxisKey = "ac" | "ag" | "cs" | "hr" | "td"

const AXES: Record<AxisKey, { label: string; abbr: string; emoji: string; color: string }> = {
    ac: { label: "Autoconciencia",       abbr: "AC", emoji: "🧠", color: "#db2777" },
    ag: { label: "Autogestión",          abbr: "AG", emoji: "🎯", color: "#7c3aed" },
    cs: { label: "Conciencia Social",    abbr: "CS", emoji: "🤝", color: "#d97706" },
    hr: { label: "Hab. Relacionales",    abbr: "HR", emoji: "💬", color: "#4f46e5" },
    td: { label: "Toma de Decisiones",   abbr: "TD", emoji: "⚖️", color: "#b45309" },
}
const AXIS_ORDER: AxisKey[] = ["ac", "ag", "cs", "hr", "td"]

interface Question { key: string; axis: AxisKey; label: string }

const QUESTIONS: Question[] = [
    { key: "ac_1", axis: "ac", label: "Puedo identificar lo que siento en distintas situaciones" },
    { key: "ac_2", axis: "ac", label: "Reconozco mis fortalezas y áreas en las que puedo mejorar" },
    { key: "ac_3", axis: "ac", label: "Entiendo cómo mis emociones afectan mi comportamiento" },
    { key: "ag_1", axis: "ag", label: "Puedo mantener la calma cuando estoy frustrado/a o enojado/a" },
    { key: "ag_2", axis: "ag", label: "Organizo mi tiempo para cumplir con mis tareas" },
    { key: "ag_3", axis: "ag", label: "Me motivo para alcanzar mis metas aunque sea difícil" },
    { key: "cs_1", axis: "cs", label: "Me pongo en el lugar de los demás cuando tienen un problema" },
    { key: "cs_2", axis: "cs", label: "Respeto las opiniones y sentimientos de otras personas aunque sean diferentes a los míos" },
    { key: "hr_1", axis: "hr", label: "Puedo comunicar lo que pienso y siento de manera clara y respetuosa" },
    { key: "hr_2", axis: "hr", label: "Trabajo bien en equipo y colaboro con mis compañeros/as" },
    { key: "hr_3", axis: "hr", label: "Sé pedir ayuda cuando la necesito" },
    { key: "td_1", axis: "td", label: "Pienso en las consecuencias antes de tomar una decisión" },
    { key: "td_2", axis: "td", label: "Busco soluciones pacíficas cuando tengo un conflicto" },
]

const OPTIONS = [
    { score: 1, label: "Me cuesta mucho",    color: "#ef4444", bg: "#fef2f2" },
    { score: 2, label: "Me cuesta un poco",  color: "#f97316", bg: "#fff7ed" },
    { score: 3, label: "A veces lo logro",   color: "#eab308", bg: "#fefce8" },
    { score: 4, label: "Lo hago bien",       color: "#3b82f6", bg: "#eff6ff" },
    { score: 5, label: "Lo hago excelente",  color: "#22c55e", bg: "#f0fdf4" },
]

const PERIOD_LABELS: Record<string, string> = {
    inicio_s1:   "Inicio Semestre 1",
    termino_s1:  "Término Semestre 1",
    inicio_s2:   "Inicio Semestre 2",
    termino_s2:  "Término Semestre 2",
}

interface Props { sessionId: string; studentId: string; institutionId: string; period: string }

export function RadarStudentForm({ sessionId, studentId, institutionId, period }: Props) {
    // -1 = intro, 0-12 = preguntas, 13 = done
    const [step, setStep] = useState(-1)
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [isPending, startTransition] = useTransition()
    const submittingRef = useRef(false) // evita doble submit

    const total = QUESTIONS.length
    const q = step >= 0 && step < total ? QUESTIONS[step] : null
    const pct = step >= 0 ? Math.round(((step + 1) / total) * 100) : 0
    const periodLabel = PERIOD_LABELS[period] ?? period

    // Recibe las respuestas finales directamente — evita stale closure del estado
    const handleSubmit = (finalAnswers: Record<string, number>) => {
        if (submittingRef.current) return
        submittingRef.current = true
        startTransition(async () => {
            const result = await submitRadarResponse(sessionId, studentId, institutionId,
                QUESTIONS.map(q => ({ question_key: q.key, casel_axis: q.axis, score: finalAnswers[q.key]! }))
            )
            if (result.success) {
                toast.success("¡Radar enviado correctamente! Gracias por tu respuesta.")
                setStep(total)
                return
            }
            else {
                // Si por condición de carrera ya existía la respuesta,
                // igual mostramos una confirmación en vez de un error bloqueante.
                if ((result.error ?? "").toLowerCase().includes("ya completaste")) {
                    toast.info("Tu respuesta ya estaba registrada. Gracias.")
                    setStep(total)
                    return
                }

                toast.error(result.error ?? "Error al enviar el cuestionario.")
                submittingRef.current = false
            }
        })
    }

    // ── INTRO ──────────────────────────────────────────────────────────────────
    if (step === -1) return (
        <div className="flex flex-col items-center text-center py-6 px-2">
            <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
                <span className="text-4xl">🎯</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Radar de Competencias</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
                Descubre tu perfil socioemocional a través de este autodiagnóstico basado en los{" "}
                <strong className="text-slate-700">5 ejes CASEL</strong>.
            </p>

            {/* Axis icons */}
            <div className="flex gap-2 mb-6">
                {AXIS_ORDER.map(key => {
                    const a = AXES[key]
                    return (
                        <div key={key} className="flex flex-col items-center gap-1.5 bg-white border border-slate-200 rounded-xl py-3 px-2 shadow-sm w-14">
                            <span className="text-xl">{a.emoji}</span>
                            <span className="text-[10px] font-bold text-slate-500">{a.abbr}</span>
                        </div>
                    )
                })}
            </div>

            {/* Period */}
            <div className="w-full max-w-xs bg-white border border-slate-200 rounded-xl p-4 mb-5 text-left shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">PERIODO DE EVALUACIÓN</p>
                <p className="text-sm font-semibold text-slate-700">{periodLabel}</p>
            </div>

            <button
                onClick={() => setStep(0)}
                className="w-full max-w-xs bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm mb-3"
            >
                Comenzar Evaluación <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-slate-400">📋 13 preguntas &nbsp;·&nbsp; ⏱ ~3 minutos</p>
        </div>
    )

    // ── DONE ───────────────────────────────────────────────────────────────────
    if (step === total) return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¡Gracias por responder!</h3>
            <p className="text-sm text-slate-500 max-w-xs">
                Tu respuesta fue registrada. Tu dupla o encargado de convivencia podrá ver los resultados de tu curso.
            </p>
        </div>
    )

    // ── QUESTION ───────────────────────────────────────────────────────────────
    if (!q) return null
    const axis = AXES[q.axis]
    const selected = answers[q.key]
    const isLast = step === total - 1

    return (
        <div className="flex flex-col gap-5">
            {/* Progress bar */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: axis.color }}
                    />
                </div>
                <span className="text-xs font-bold text-slate-400 shrink-0 tabular-nums">{step + 1}/{total}</span>
            </div>

            {/* Axis tabs */}
            <div className="flex gap-1.5">
                {AXIS_ORDER.map(key => {
                    const a = AXES[key]
                    const isActive = key === q.axis
                    return (
                        <div
                            key={key}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all"
                            style={isActive
                                ? { backgroundColor: axis.color + "18", color: axis.color, border: `1.5px solid ${axis.color}40` }
                                : { color: "#94a3b8", border: "1.5px solid transparent" }
                            }
                        >
                            <span className="text-sm">{a.emoji}</span>
                            <span className="hidden sm:inline">{a.abbr}</span>
                        </div>
                    )
                })}
            </div>

            {/* Question card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: axis.color }}>
                    {axis.label}
                </p>
                <p className="text-lg font-bold text-slate-800 leading-snug mb-6">{q.label}</p>

                {/* Options */}
                <div className="grid grid-cols-5 gap-2">
                    {OPTIONS.map(opt => {
                        const isSelected = selected === opt.score
                        return (
                            <button
                                key={opt.score}
                                onClick={() => {
                                    const newAnswers = { ...answers, [q.key]: opt.score }
                                    setAnswers(newAnswers)
                                    // Importante: en la última pregunta NO enviamos automáticamente.
                                    // El estudiante debe apretar sí o sí el botón "Finalizar".
                                    if (step === total - 1) return

                                    // Auto-avanzar con las respuestas actualizadas (evita stale closure)
                                    setTimeout(() => setStep(s => s + 1), 380)
                                }}
                                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all text-center"
                                style={isSelected
                                    ? { borderColor: opt.color, backgroundColor: opt.bg }
                                    : { borderColor: "#f1f5f9", backgroundColor: "#f8fafc" }
                                }
                                aria-label={opt.label}
                            >
                                {/* Colored dot */}
                                <span
                                    className="w-8 h-8 rounded-full shadow-sm block transition-transform"
                                    style={{
                                        backgroundColor: opt.color,
                                        transform: isSelected ? "scale(1.12)" : "scale(1)",
                                        boxShadow: isSelected ? `0 4px 12px ${opt.color}55` : undefined,
                                    }}
                                />
                                <span className="text-[10px] font-semibold text-slate-500 leading-tight text-center px-1">
                                    {opt.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
                <button
                    onClick={() => step === 0 ? setStep(-1) : setStep(s => s - 1)}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Atrás
                </button>

                <button
                    onClick={() => isLast ? handleSubmit({ ...answers }) : setStep(s => s + 1)}
                    disabled={!selected || isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm"
                    style={{ backgroundColor: selected ? axis.color : "#94a3b8" }}
                >
                    {isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : isLast ? (
                        <>Finalizar <span>✓</span></>
                    ) : (
                        <>Siguiente <ArrowRight className="w-4 h-4" /></>
                    )}
                </button>
            </div>
        </div>
    )
}
