"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Download } from "lucide-react"
import jsPDF from "jspdf"

interface Props {
    institutionName?: string
}

export function DecStatsAiAssistant({ institutionName }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [response, setResponse] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    const handleGenerate = async () => {
        setLoading(true)
        setError(null)
        setResponse(null)

        try {
            const res = await fetch("/api/ai/dec-stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            })

            if (!res.ok) {
                throw new Error(`Status ${res.status}`)
            }

            const data = await res.json()
            setResponse(data.text ?? "")
        } catch (e) {
            console.error(e)
            setError("No se pudo generar el análisis. Intenta nuevamente.")
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadPdf = () => {
        if (!response) return
        setDownloading(true)
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
            const marginX = 16
            let y = 18

            doc.setFont("helvetica", "bold")
            doc.setFontSize(16)
            doc.text("Nitiv — Análisis IA estadísticas DEC", marginX, y)
            y += 8

            doc.setFontSize(10)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(100)
            if (institutionName) {
                doc.text(institutionName, marginX, y)
                y += 5
            }
            doc.text(`Fecha: ${new Date().toLocaleDateString("es-CL")}`, marginX, y)
            y += 8

            doc.setTextColor(0)
            doc.setFontSize(11)
            doc.setFont("helvetica", "normal")

            const lines = doc.splitTextToSize(response, doc.internal.pageSize.width - marginX * 2)
            const pageHeight = doc.internal.pageSize.height

            for (const line of lines) {
                if (y > pageHeight - 20) {
                    doc.addPage()
                    y = 18
                }
                doc.text(line, marginX, y)
                y += 5
            }

            doc.save(`analisis_ia_estadisticas_DEC.pdf`)
        } catch (e) {
            console.error(e)
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3">
            <AnimatePresence mode="wait">
                {open && (
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: 12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="w-96 max-h-[520px] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
                    >
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/80">
                        <div className="flex items-center gap-2 min-w-0">
                            <img src="/2%20ft.svg" alt="" className="h-9 w-15 shrink-0 object-contain" aria-hidden />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                    Análisis IA de estadísticas DEC
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                    Resumen y recomendaciones CASEL
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
                            aria-label="Cerrar asistente IA"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50">
                        {!response && !error && !loading && (
                            <div className="text-[11px] text-slate-500 space-y-2">
                                <p>
                                    La IA analiza todas las estadísticas DEC del período actual (cursos, severidad, tendencia, estudiantes con más registros, conductas, desencadenantes y acciones) y entrega:
                                </p>
                                <ul className="list-disc list-inside space-y-1 pl-1">
                                    <li>Un resumen detallado de los datos.</li>
                                    <li>Patrones de acción basados en aprendizaje socioemocional (marco CASEL).</li>
                                    <li>Sugerencias para dupla, convivencia y trabajo en aula.</li>
                                </ul>
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center justify-center min-h-[120px] text-slate-400 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-xs">Analizando estadísticas DEC...</span>
                            </div>
                        )}

                        {error && (
                            <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        {response && !loading && !error && (
                            <div className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                                {response}
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-2 border-t bg-white flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500 text-white text-xs font-semibold px-3 py-2 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Analizando...
                                </>
                            ) : (
                                "Analizar con IA"
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={!response || downloading}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {downloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Download className="w-3.5 h-3.5" />
                            )}
                            PDF
                        </button>
                    </div>
                </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center justify-center p-1 text-slate-700 hover:text-slate-900 transition-colors"
                aria-label="Abrir análisis IA de estadísticas DEC"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                {open ? (
                    <X className="w-7 h-7 shrink-0" />
                ) : (
                    <img src="/2%20ft.svg" alt="IA" className="w-16 h-16 object-contain shrink-0" />
                )}
            </motion.button>
        </div>
    )
}
