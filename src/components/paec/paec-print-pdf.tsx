"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Download, Loader2 } from "lucide-react"
import { buildPaecPdf, type PaecPdfData } from "@/lib/pdf/paec-pdf"
import { loadInstitutionLogoForPdf, loadNitivLogoBase64 } from "@/lib/pdf/load-logos"
import { toast } from "sonner"

type Props = {
    data: PaecPdfData
    institutionName?: string
    institutionLogoUrl?: string
}

export function PaecPrintPdf({ data, institutionName, institutionLogoUrl }: Props) {
    const [downloading, setDownloading] = useState(false)

    const buildDocWithLogos = async () => {
        const [logoInst, logoNitiv] = await Promise.all([
            institutionLogoUrl ? loadInstitutionLogoForPdf(institutionLogoUrl) : Promise.resolve(null),
            loadNitivLogoBase64(),
        ])
        return buildPaecPdf(data, institutionName, logoInst, logoNitiv)
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPdf = () => {
        setDownloading(true)
        buildDocWithLogos()
            .then((doc) => {
                const name = data.student
                    ? `PAEC_${(data.student.last_name ?? "").replace(/\s+/g, "_")}_${(data.student.name ?? "").replace(/\s+/g, "_")}`
                    : "PAEC"
                doc.save(`${name}.pdf`)
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
            <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
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
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descargar PDF
            </Button>
        </div>
    )
}
