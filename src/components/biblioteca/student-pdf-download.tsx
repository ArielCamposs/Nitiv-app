"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2 } from "lucide-react"
import { StudentLibraryItem } from "@/data/student-library"
import jsPDF from "jspdf"
import { toast } from "sonner"

export function StudentPdfDownload({ item, institutionName }: { item: StudentLibraryItem; institutionName?: string }) {
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownload = () => {
        setIsDownloading(true)

        try {
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            })

            // Configuración de márgenes y posiciones
            const margin = 20
            const pageWidth = doc.internal.pageSize.width
            const contentWidth = pageWidth - margin * 2
            let yPos = margin

            if (institutionName) {
                doc.setFont("helvetica", "normal")
                doc.setFontSize(10)
                doc.setTextColor(100, 116, 139)
                doc.text(institutionName, margin, yPos)
                yPos += 8
            }

            // Funciones de ayuda para añadir texto
            const addTitle = (text: string) => {
                doc.setFont("helvetica", "bold")
                doc.setFontSize(18)
                doc.setTextColor(30, 41, 59) // slate-800
                const lines = doc.splitTextToSize(text, contentWidth)
                doc.text(lines, margin, yPos)
                yPos += (lines.length * 8) + 5

                // Línea separadora
                doc.setDrawColor(226, 232, 240) // slate-200
                doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3)
                yPos += 5
            }

            const addCategory = (text: string) => {
                doc.setFont("helvetica", "bold")
                doc.setFontSize(10)
                doc.setTextColor(79, 70, 229) // indigo-600
                doc.text(text.toUpperCase(), margin, yPos)
                yPos += 8
            }

            const addParagraph = (text: string, isBold = false) => {
                doc.setFont("helvetica", isBold ? "bold" : "normal")
                doc.setFontSize(11)
                doc.setTextColor(71, 85, 105) // slate-600

                const lines = doc.splitTextToSize(text, contentWidth)

                // Check if page break is needed
                if (yPos + (lines.length * 5) > doc.internal.pageSize.height - margin) {
                    doc.addPage()
                    yPos = margin
                }

                doc.text(lines, margin, yPos)
                yPos += (lines.length * 5) + 4
            }

            const addHeader2 = (text: string) => {
                // Check if page break is needed
                if (yPos + 15 > doc.internal.pageSize.height - margin) {
                    doc.addPage()
                    yPos = margin
                }

                yPos += 4
                doc.setFont("helvetica", "bold")
                doc.setFontSize(14)
                doc.setTextColor(15, 23, 42) // slate-900
                doc.text(text, margin, yPos)
                yPos += 7
            }

            const addBullet = (text: string) => {
                doc.setFont("helvetica", "normal")
                doc.setFontSize(11)
                doc.setTextColor(71, 85, 105) // slate-600

                const lines = doc.splitTextToSize(text, contentWidth - 8)

                // Check if page break is needed
                if (yPos + (lines.length * 5) > doc.internal.pageSize.height - margin) {
                    doc.addPage()
                    yPos = margin
                }

                // Bullet point
                doc.circle(margin + 2, yPos - 1.5, 0.8, 'F')
                doc.text(lines, margin + 8, yPos)

                yPos += (lines.length * 5) + 3
            }

            // Construir el documento
            addCategory(item.category)
            addTitle(item.title)

            // Intro
            addParagraph(item.content.intro)

            // Sections
            item.content.sections.forEach(section => {
                addHeader2(section.title)
                section.items.forEach(bulletText => {
                    addBullet(bulletText)
                })
            })

            // Warning if exists
            if (item.content.warning) {
                yPos += 5

                // Configurar tipo y tamaño de fuente ANTES de calcular el ajuste de texto
                doc.setFont("helvetica", "bold")
                doc.setFontSize(11)

                // jsPDF (helvetica) no soporta el emoji de advertencia, lo reemplazamos
                const cleanWarning = item.content.warning.replace('⚠️ ', 'IMPORTANTE: ')

                // Ahora sí calcular cuántas líneas tomará
                const warningLines = doc.splitTextToSize(cleanWarning, contentWidth - 10)
                const boxHeight = (warningLines.length * 6) + 6

                // Check if page break is needed
                if (yPos + boxHeight > doc.internal.pageSize.height - margin) {
                    doc.addPage()
                    yPos = margin
                }

                // Warning box background
                doc.setFillColor(254, 252, 232) // yellow-50
                doc.setDrawColor(253, 224, 71) // yellow-300
                doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'FD')

                doc.setTextColor(161, 98, 7) // yellow-700
                doc.text(warningLines, margin + 5, yPos + 7)

                yPos += boxHeight + 10
            }

            // Footer en todas las páginas
            const pageCount = (doc.internal as any).getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                doc.setFont("helvetica", "normal")
                doc.setFontSize(9)
                doc.setTextColor(148, 163, 184) // slate-400
                doc.text(`Nitiv - Biblioteca Estudiante - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" })
            }

            // Guardar el archivo
            doc.save(`${item.id}-nitiv.pdf`)
            toast.success("PDF descargado correctamente")

        } catch (error) {
            console.error(error)
            toast.error("Ocurrió un error al generar el PDF")
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
            {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Download className="w-4 h-4" />
            )}
            Descargar Artículo en PDF
        </Button>
    )
}
