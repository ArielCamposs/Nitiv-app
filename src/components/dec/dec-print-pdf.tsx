"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Download, Loader2 } from "lucide-react"
import { buildDecPdf, type DecPdfData } from "@/lib/pdf/dec-pdf"
import { loadInstitutionLogoForPdf, loadNitivLogoBase64 } from "@/lib/pdf/load-logos"
import { toast } from "sonner"

type Props = {
    data: DecPdfData
    institutionName?: string
    institutionLogoUrl?: string
}

export function DecPrintPdf({ data, institutionName, institutionLogoUrl }: Props) {
    const [downloading, setDownloading] = useState(false)
    const [printing, setPrinting] = useState(false)

    const buildDocWithLogos = async () => {
        const [logoInst, logoNitiv] = await Promise.all([
            institutionLogoUrl ? loadInstitutionLogoForPdf(institutionLogoUrl) : Promise.resolve(null),
            loadNitivLogoBase64(),
        ])
        return buildDecPdf(data, institutionName, logoInst, logoNitiv)
    }

    const handlePrint = () => {
        setPrinting(true)
        buildDocWithLogos()
            .then((doc) => {
                const blob = doc.output("blob")
                const url = URL.createObjectURL(blob)
                const w = window.open(url, "_blank")
                if (w) {
                    setTimeout(() => {
                        try {
                            w.print()
                        } finally {
                            URL.revokeObjectURL(url)
                        }
                    }, 600)
                    toast.success("Se abrió el PDF. Usa la ventana de impresión para el mismo formato.")
                } else {
                    URL.revokeObjectURL(url)
                    toast.error("Permite ventanas emergentes para imprimir el PDF")
                }
            })
            .catch((e) => {
                console.error(e)
                toast.error("No se pudo generar el PDF para imprimir")
            })
            .finally(() => setPrinting(false))
    }

    const handleDownloadPdf = () => {
        setDownloading(true)
        buildDocWithLogos()
            .then((doc) => {
                const name = data.student
                    ? `DEC_${(data.student.last_name ?? "").replace(/\s+/g, "_")}_${(data.student.name ?? "").replace(/\s+/g, "_")}`
                    : "Ficha_DEC"
                const folio = data.folio ? `_${data.folio}` : ""
                doc.save(`${name}${folio}.pdf`)
                toast.success("PDF descargado")
            })
            .catch((e) => {
                console.error(e)
                toast.error("No se pudo generar el PDF")
            })
            .finally(() => setDownloading(false))
    }

    return (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={printing}
                className="gap-2"
            >
                {printing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Printer className="h-4 w-4" />
                )}
                Imprimir
            </Button>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="gap-2"
            >
                {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Download className="h-4 w-4" />
                )}
                Descargar PDF
            </Button>
        </div>
    )
}
