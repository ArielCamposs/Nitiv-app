import { getHeatmapData } from "@/lib/data/get-heatmap-data"
import { ClimateHeatmapTabs } from "@/components/heatmap/climate-heatmap-tabs"
import { ClimateAiAssistant } from "@/components/heatmap/climate-ai-assistant"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function DuplaHeatmapPage() {
    const { courses, historyLogs, teachers, institutionName } = await getHeatmapData()
    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/dupla" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Clima de aula por curso</h1>
                        <p className="text-slate-500 text-sm">
                            Evolución histórica interactiva de la energía del aula
                        </p>
                    </div>
                </div>
                <ClimateHeatmapTabs courses={courses} historyLogs={historyLogs} teachers={teachers} />
                <ClimateAiAssistant courses={courses} institutionName={institutionName} />
            </div>
        </main>
    )
}
