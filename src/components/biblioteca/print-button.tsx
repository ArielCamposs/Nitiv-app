"use client"

import { useState } from "react"
import { Printer, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import jsPDF from "jspdf"
import html2canvas from "html2canvas-pro"

export function PrintButton() {
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownloadPDF = async () => {
        setIsDownloading(true)
        try {
            const printElement = document.getElementById("print-area")
            if (!printElement) {
                toast.error("No se encontró la plantilla para descargar.")
                return
            }

            // Temporarily make it visible for html2canvas to capture it accurately
            const originalDisplay = printElement.style.display
            const originalPosition = printElement.style.position

            printElement.classList.remove('hidden')
            printElement.classList.remove('inset-0')
            printElement.style.display = 'block'
            printElement.style.position = 'fixed'
            printElement.style.top = '-10000px'
            printElement.style.left = '-10000px'
            printElement.style.width = '210mm'
            printElement.style.height = '297mm'
            printElement.style.zIndex = '-9999'

            // Small delay to let styles apply
            await new Promise(resolve => setTimeout(resolve, 100))

            const canvas = await html2canvas(printElement, {
                scale: 2, // Higher quality scaling
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff' // Ensure white background
            })

            const imgData = canvas.toDataURL('image/png')

            // A4 size: 210 x 297 mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            // If the content is longer than a page, this will scale it down to fit the width. 
            // In our CSS it's strictly constrained to an A4 height anyway, so it should fit perfectly.
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save('plantilla-actividad.pdf')

            // Restore styles
            printElement.classList.add('hidden')
            printElement.classList.add('inset-0')
            printElement.style.display = originalDisplay
            printElement.style.position = originalPosition
            printElement.style.top = ''
            printElement.style.left = ''
            printElement.style.width = ''
            printElement.style.height = ''
            printElement.style.zIndex = ''

            toast.success("PDF descargado correctamente.")

        } catch (error) {
            console.error("Error generating PDF:", error)
            toast.error("Hubo un error al generar el PDF. Por favor, usa el botón de Imprimir.")
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button
                onClick={() => {
                    if (typeof window !== "undefined") {
                        window.print()
                    }
                }}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2"
                size="lg"
            >
                <Printer className="w-5 h-5" />
                Imprimir Actividad
            </Button>

            <Button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                variant="outline"
                className="w-full sm:w-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm gap-2"
                size="lg"
            >
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isDownloading ? "Generando..." : "Descargar Actividad"}
            </Button>
        </div>
    )
}
