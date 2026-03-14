"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DecListDupla } from "@/components/dec/dec-list-dupla"
import { DecStatsTab, type DecStatsData } from "@/components/dec/dec-stats-tab"
import { ClipboardList, BarChart3 } from "lucide-react"

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
}

export function DecPageTabs({ cases, currentUserId, userRole, decStats }: Props) {
    return (
        <Tabs defaultValue="casos" className="w-full">
            <TabsList className="grid w-full max-w-sm grid-cols-2 mb-4">
                <TabsTrigger value="casos" className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Casos
                </TabsTrigger>
                <TabsTrigger value="estadisticas" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Estadísticas
                </TabsTrigger>
            </TabsList>
            <TabsContent value="casos" className="mt-0">
                <DecListDupla cases={cases} currentUserId={currentUserId} userRole={userRole} />
            </TabsContent>
            <TabsContent value="estadisticas" className="mt-0">
                <DecStatsTab stats={decStats} />
            </TabsContent>
        </Tabs>
    )
}
