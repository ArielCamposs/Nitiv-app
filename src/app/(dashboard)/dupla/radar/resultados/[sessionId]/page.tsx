import { RadarResultsPage } from "@/components/radar/RadarResultsPage"

export default function DuplaRadarResultados({ params }: { params: Promise<{ sessionId: string }> }) {
    return <RadarResultsPage params={params} role="dupla" />
}
