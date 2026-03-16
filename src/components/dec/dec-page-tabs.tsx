"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DecListDupla } from "@/components/dec/dec-list-dupla"
import { DecStatsTab, type DecStatsData } from "@/components/dec/dec-stats-tab"
import { ClipboardList, BarChart3, FileDown } from "lucide-react"
import { loadInstitutionLogoForPdf, loadNitivLogoBase64 } from "@/lib/pdf/load-logos"
import { buildDecStatsPdf } from "@/lib/pdf/dec-stats-pdf"
import { toast } from "sonner"

type DecCase = {
    id: string
    folio: string
    type: string
    severity: string
    location: string | null
    incident_date: string
    end_date?: string | null
    resolved: boolean
    students: { id: string; name: string; last_name: string; courses: { name: string } | null } | null
    users: { name: string; last_name: string; role: string } | null
    incident_recipients: Array<{ id: string; recipient_id: string; seen: boolean; seen_at: string | null; role: string }>
}

type Props = {
    cases: DecCase[]
    currentUserId: string
    userRole: string
    decStats: DecStatsData
    institutionName?: string
    institutionLogoUrl?: string | null
}

export function DecPageTabs({ cases, currentUserId, userRole, decStats, institutionName, institutionLogoUrl }: Props) {
    const [downloadingPdf, setDownloadingPdf] = useState(false)

    async function handleDownloadPdf() {
        setDownloadingPdf(true)
        try {
            const [instLogo, nitivLogo] = await Promise.all([
                institutionLogoUrl ? loadInstitutionLogoForPdf(institutionLogoUrl) : Promise.resolve(null),
                loadNitivLogoBase64(),
            ])
            const doc = buildDecStatsPdf(decStats, institutionName ?? "Institución", instLogo, nitivLogo)
            const year = new Date().getFullYear()
            doc.save(`Estadisticas_DEC_${year}_${new Date().toISOString().slice(0, 10)}.pdf`)
            toast.success("PDF descargado.")
        } catch (e) {
            console.error(e)
            toast.error("No se pudo generar el PDF.")
        } finally {
            setDownloadingPdf(false)
        }
    }

    return (
        <Tabs defaultValue="casos" className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <TabsList className="grid w-full max-w-sm grid-cols-2 shrink-0">
                    <TabsTrigger value="casos" className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Casos
                    </TabsTrigger>
                    <TabsTrigger value="estadisticas" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Estadísticas
                    </TabsTrigger>
                </TabsList>
                <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloadingPdf} className="gap-2 shrink-0 ml-auto">
                    <FileDown className="h-4 w-4" />
                    {downloadingPdf ? "Generando…" : "Descargar PDF"}
                </Button>
            </div>
            <TabsContent value="casos" className="mt-0">
                <DecListDupla cases={cases} currentUserId={currentUserId} userRole={userRole} />
            </TabsContent>
            <TabsContent value="estadisticas" className="mt-0">
                <DecStatsTab stats={decStats} institutionName={institutionName} institutionLogoUrl={institutionLogoUrl} />
            </TabsContent>
        </Tabs>
    )
}
