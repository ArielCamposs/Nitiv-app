"use client"

import { useState, useEffect } from "react"
import { Sparkles, X, Loader2, Download } from "lucide-react"
import jsPDF from "jspdf"

type CourseItem = { course_id: string; courses: { name: string } }

interface Props {
    courses: CourseItem[]
    institutionName?: string
}

export function ClimateAiAssistant({ courses, institutionName }: Props) {
    const [open, setOpen] = useState(false)
    const [selectedCourseId, setSelectedCourseId] = useState(
        courses[0]?.course_id ?? ""
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [response, setResponse] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        const handleClose = (e: any) => {
            if (e.detail?.id !== 'climate-ai') {
                setOpen(false)
            }
        }
        window.addEventListener("nitiv:close-floating-widgets", handleClose)
        return () => window.removeEventListener("nitiv:close-floating-widgets", handleClose)
    }, [])

    const toggleOpen = () => {
        if (!open) {
            window.dispatchEvent(new CustomEvent("nitiv:close-floating-widgets", { detail: { id: 'climate-ai' } }))
            setOpen(true)
        } else {
            setOpen(false)
        }
    }

    if (!courses.length) return null

    const selectedCourse = courses.find(c => c.course_id === selectedCourseId)

    const handleGenerate = async () => {
        if (!selectedCourseId) return

        setLoading(true)
        setError(null)
        setResponse(null)

        try {
            const res = await fetch("/api/ai/climate-course", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId: selectedCourseId }),
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
        if (!response || !selectedCourse) return
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
            
            const courseName = selectedCourse.courses?.name ?? selectedCourse.course_id

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
                doc.text("Análisis de Clima de Aula", pageWidth - marginX, 16, { align: "right" })
                
                y = 35
                
                if (pageNum === 1) {
                    // Título principal
                    doc.setTextColor(30, 41, 59) // Slate-800
                    doc.setFont("helvetica", "bold")
                    doc.setFontSize(18)
                    doc.text(`Recomendaciones de Clima Escolar`, marginX, y)
                    y += 8
                    
                    doc.setFont("helvetica", "normal")
                    doc.setFontSize(11)
                    doc.setTextColor(100, 116, 139) // Slate-500
                    if (institutionName) {
                        doc.text(institutionName, marginX, y)
                        y += 5
                    }
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
            doc.save(`recomendacion_ia_clima_${safeName}.pdf`)
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
                                    Asistente IA de clima por curso
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                    Recomienda según registros de clima de aula
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

                    {/* Selector de curso */}
                    <div className="px-4 pt-3 pb-2 border-b bg-white">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Curso a analizar
                        </label>
                        <select
                            value={selectedCourseId}
                            onChange={e => setSelectedCourseId(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white"
                        >
                            {courses.map(c => (
                                <option key={c.course_id} value={c.course_id}>
                                    {c.courses?.name ?? c.course_id}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-[10px] text-slate-400">
                            La IA usa los últimos 90 días de registros de clima de aula de este curso.
                        </p>
                    </div>

                    {/* Contenido / respuesta */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50">
                        {!response && !error && !loading && (
                            <div className="text-[11px] text-slate-500 space-y-1">
                                <p>
                                    Selecciona un curso y genera recomendaciones personalizadas para la dupla y el equipo docente, basadas en el clima registrado.
                                </p>
                                <p>
                                    Ideal para priorizar cursos y planificar acompañamientos.
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs">
                                    Analizando registros de {selectedCourse?.courses?.name ?? "el curso"}...
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
                            disabled={loading || !selectedCourseId}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold px-3 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generando IA...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Generar IA
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
                aria-label="Abrir asistente IA de clima por curso"
            >
                {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </button>
        </div>
    )
}
