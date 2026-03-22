"use client"

import { useState, useEffect } from "react"
import { Sparkles, X, Loader2, Download } from "lucide-react"
import jsPDF from "jspdf"
import type { CourseStats } from "./CourseStudentsClient"

interface Props {
    courseName: string
    stats: CourseStats
}

export function CourseStatsAiAssistant({ courseName, stats }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [response, setResponse] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        const handleClose = (e: any) => {
            if (e.detail?.id !== 'course-stats-ai') {
                setOpen(false)
            }
        }
        window.addEventListener("nitiv:close-floating-widgets", handleClose)
        return () => window.removeEventListener("nitiv:close-floating-widgets", handleClose)
    }, [])

    const toggleOpen = () => {
        if (!open) {
            window.dispatchEvent(new CustomEvent("nitiv:close-floating-widgets", { detail: { id: 'course-stats-ai' } }))
            setOpen(true)
        } else {
            setOpen(false)
        }
    }

    const handleGenerate = async () => {
        setLoading(true)
        setError(null)
        setResponse(null)

        try {
            const res = await fetch("/api/ai/course-stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseName, stats }),
            })

            if (!res.ok) {
                throw new Error(`Status ${res.status}`)
            }

            const data = await res.json()
            setResponse(data.text ?? "")
        } catch (e) {
            console.error(e)
            setError("No se pudo generar la recomendación. Intenta nuevamente.")
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadPdf = () => {
        if (!response) return
        setDownloading(true)
        try {
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            })
            
            const pageWidth = doc.internal.pageSize.width
            const pageHeight = doc.internal.pageSize.height
            const marginX = 20
            const contentWidth = pageWidth - marginX * 2
            let y = 0

            const addHeader = (pageNum: number) => {
                // Barra superior (sin color fuerte para impresión)
                doc.setFillColor(248, 250, 252) // Slate-50
                doc.rect(0, 0, pageWidth, 25, "F")
                
                doc.setTextColor(15, 23, 42) // Slate-900
                doc.setFont("helvetica", "bold")
                doc.setFontSize(16)
                doc.text("Nitiv", marginX, 16)
                
                doc.setTextColor(100, 116, 139) // Slate-500
                doc.setFont("helvetica", "normal")
                doc.setFontSize(10)
                doc.text("Análisis Integral de Curso", pageWidth - marginX, 16, { align: "right" })
                
                y = 35
                
                if (pageNum === 1) {
                    // Título principal
                    doc.setTextColor(30, 41, 59) // Slate-800
                    doc.setFont("helvetica", "bold")
                    doc.setFontSize(18)
                    doc.text(`Informe de Estadísticas y Recomendaciones`, marginX, y)
                    y += 8
                    
                    doc.setFont("helvetica", "normal")
                    doc.setFontSize(11)
                    doc.setTextColor(100, 116, 139) // Slate-500
                    doc.text(`Curso: ${courseName}`, marginX, y)
                    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-CL")}`, pageWidth - marginX, y, { align: "right" })
                    y += 15
                    
                    // Línea separadora
                    doc.setDrawColor(226, 232, 240) // Slate-200
                    doc.line(marginX, y - 5, pageWidth - marginX, y - 5)
                }
            }

            const addFooter = (pageNum: number) => {
                doc.setFillColor(248, 250, 252) // Slate-50
                doc.rect(0, pageHeight - 15, pageWidth, 15, "F")
                
                doc.setTextColor(148, 163, 184) // Slate-400
                doc.setFont("helvetica", "normal")
                doc.setFontSize(8)
                doc.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 6, { align: "center" })
            }

            let pageNum = 1
            addHeader(pageNum)

            // Procesar el texto
            const paragraphs = response.split('\n')
            
            for (const paragraph of paragraphs) {
                if (paragraph.trim() === '') {
                    y += 4
                    continue
                }

                // Detectar si es un título (empieza con número o asteriscos)
                const isTitle = /^(?:\d+\.|#+ |\*\*)/.test(paragraph.trim())
                const cleanText = paragraph.replace(/\*\*/g, '').replace(/^#+ /, '').trim()

                if (isTitle) {
                    doc.setFont("helvetica", "bold")
                    doc.setFontSize(12)
                    doc.setTextColor(30, 41, 59)
                    y += 4 // Espacio extra antes de un título
                } else {
                    doc.setFont("helvetica", "normal")
                    doc.setFontSize(10)
                    doc.setTextColor(71, 85, 105) // Slate-600
                }

                const lines = doc.splitTextToSize(cleanText, contentWidth)

                for (const line of lines) {
                    if (y > pageHeight - 30) {
                        addFooter(pageNum)
                        doc.addPage()
                        pageNum++
                        addHeader(pageNum)
                    }
                    doc.text(line, marginX, y)
                    y += isTitle ? 6 : 5
                }
            }

            // Nota aclaratoria al final
            y += 10
            if (y > pageHeight - 35) {
                addFooter(pageNum)
                doc.addPage()
                pageNum++
                addHeader(pageNum)
            }

            doc.setFillColor(241, 245, 249) // Slate-100
            doc.roundedRect(marginX, y, contentWidth, 25, 2, 2, "F")
            
            doc.setFont("helvetica", "bold")
            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139)
            doc.text("Aviso Importante:", marginX + 4, y + 6)
            
            doc.setFont("helvetica", "italic")
            doc.setFontSize(8)
            const disclaimer = "Este análisis es generado por Inteligencia Artificial basándose en los datos cuantitativos registrados en la plataforma. Estas son solo recomendaciones y sugerencias de apoyo; no deben seguirse al 100% como reglas estrictas. El criterio profesional, la experiencia y el conocimiento directo que el equipo docente tiene sobre sus estudiantes siempre deben primar en la toma de decisiones."
            const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 8)
            
            let dy = y + 11
            for (const line of disclaimerLines) {
                doc.text(line, marginX + 4, dy)
                dy += 4
            }

            addFooter(pageNum)

            const safeName = courseName.replace(/\s+/g, "_")
            doc.save(`analisis_ia_curso_${safeName}.pdf`)
        } catch (e) {
            console.error(e)
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3">
            {open && (
                <div className="w-80 max-h-[460px] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/80">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                    Análisis IA del Curso
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                    Recomendaciones para docentes
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                            aria-label="Cerrar asistente IA"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Contenido / respuesta */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50">
                        {!response && !error && !loading && (
                            <div className="text-[11px] text-slate-500 space-y-2">
                                <p>
                                    La IA analizará todas las estadísticas actuales de <strong>{courseName}</strong> (clima de aula, radar de competencias y casos de convivencia).
                                </p>
                                <p>
                                    Generará un diagnóstico integral y recomendaciones prácticas enfocadas en el trabajo docente en el aula.
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs">
                                    Analizando estadísticas del curso...
                                </span>
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

                    {/* Botones de acción */}
                    <div className="px-4 py-2 border-t bg-white flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold px-3 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {response ? "Regenerar" : "Generar Análisis"}
                                </>
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
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={toggleOpen}
                className="h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 flex items-center justify-center"
                aria-label="Abrir análisis IA del curso"
            >
                {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </button>
        </div>
    )
}
