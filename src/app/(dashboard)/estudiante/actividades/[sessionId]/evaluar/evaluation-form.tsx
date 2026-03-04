"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { submitActivityEvaluation } from "./actions"

interface EvaluationFormProps {
    sessionId: string
    activityTitle: string
}

function ScaleSelector({
    value,
    onChange,
    labelLeft,
    labelRight
}: {
    value: number | null,
    onChange: (val: number) => void,
    labelLeft: string,
    labelRight: string
}) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between px-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span>{labelLeft}</span>
                <span>{labelRight}</span>
            </div>
            <div className="flex justify-between gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => onChange(num)}
                        className={`flex-1 aspect-square max-h-12 flex items-center justify-center rounded-xl font-bold text-sm sm:text-base border-2 transition-all ${value === num
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 scale-105 shadow-sm"
                            : "border-slate-100 bg-white text-slate-400 hover:border-emerald-200 hover:text-emerald-600 hover:bg-slate-50"
                            }`}
                    >
                        {num}
                    </button>
                ))}
            </div>
        </div>
    )
}

export function EvaluationForm({ sessionId }: EvaluationFormProps) {
    const [emotionalUtility, setEmotionalUtility] = useState<number | null>(null)
    const [energyPost, setEnergyPost] = useState<number | null>(null)
    const [feedbackRating, setFeedbackRating] = useState<number | null>(null)
    const [feedback, setFeedback] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const isComplete = emotionalUtility !== null && energyPost !== null && feedbackRating !== null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!isComplete) {
            toast.error("Por favor, responde las 3 preguntas antes de enviar.")
            return
        }

        setLoading(true)
        const res = await submitActivityEvaluation({
            sessionId,
            emotionalUtility,
            energyPost,
            feedbackRating,
            feedback
        })
        setLoading(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("¡Bacán! Gracias por valorar la actividad de tu profe 🚀")
            router.refresh()
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            {/* Pregunta 1: Utilidad Emocional */}
            <div className="space-y-4">
                <label className="text-base font-semibold text-slate-800 block text-center">
                    1. Utilidad Emocional
                </label>
                <p className="text-sm text-slate-500 text-center mb-4">
                    ¿Esta actividad te ayudó a entender mejor cómo te sientes o cómo se sienten los demás?
                </p>
                <ScaleSelector
                    value={emotionalUtility}
                    onChange={setEmotionalUtility}
                    labelLeft="Nada (1)"
                    labelRight="Mucho (7)"
                />
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Pregunta 2: Nivel de Energía */}
            <div className="space-y-4">
                <label className="text-base font-semibold text-slate-800 block text-center">
                    2. Nivel de Energía (Post-actividad)
                </label>
                <p className="text-sm text-slate-500 text-center mb-4">
                    ¿Cómo te vas de esta clase? (Desde muy explosivo/inquieto hasta muy regulado)
                </p>
                <ScaleSelector
                    value={energyPost}
                    onChange={setEnergyPost}
                    labelLeft="Explosivo/Inquieto (1)"
                    labelRight="Muy Regulado (7)"
                />
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Pregunta 3: Feedback Rápido */}
            <div className="space-y-4">
                <label className="text-base font-semibold text-slate-800 block text-center">
                    3. Feedback de la Actividad
                </label>
                <p className="text-sm text-slate-500 text-center mb-4">
                    ¿Qué tan útil o interesante te pareció el tema tratado hoy?
                </p>
                <ScaleSelector
                    value={feedbackRating}
                    onChange={setFeedbackRating}
                    labelLeft="No me sirvió (1)"
                    labelRight="Me sirvió mucho (7)"
                />
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Feedback Adicional */}
            <div className="space-y-3 px-2">
                <label htmlFor="feedback" className="text-sm font-medium text-slate-700">
                    ¿Quieres contarnos algo más? (Opcional)
                </label>
                <Textarea
                    id="feedback"
                    placeholder="Escribe aquí si te gustó algo en especial o si tienes alguna sugerencia..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[100px] resize-none border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    disabled={loading}
                />
            </div>

            <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg rounded-xl shadow-sm transition-all"
                disabled={loading || !isComplete}
            >
                {loading ? (
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                ) : (
                    <>
                        Enviar mi valoración
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                )}
            </Button>
        </form>
    )
}
