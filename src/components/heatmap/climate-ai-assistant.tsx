"use client"

import { useState } from "react"
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
            const marginX = 16
            let y = 18

            const today = new Date().toLocaleDateString("es-CL")
            const courseName = selectedCourse.courses?.name ?? selectedCourse.course_id

            doc.setFont("helvetica", "bold")
            doc.setFontSize(16)
            doc.text("Nitiv — Recomendación IA de clima", marginX, y)
            y += 8

            doc.setFontSize(10)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(100)
            if (institutionName) {
                doc.text(institutionName, marginX, y)
                y += 5
            }
            doc.text(`Curso: ${courseName}`, marginX, y)
            y += 5
            doc.text(`Fecha: ${today}`, marginX, y)
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
                            <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
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
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold px-3 py-2 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                onClick={() => setOpen(v => !v)}
                className="h-12 w-12 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-all hover:scale-105 flex items-center justify-center"
                aria-label="Abrir asistente IA de clima por curso"
            >
                {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </button>
        </div>
    )
}
