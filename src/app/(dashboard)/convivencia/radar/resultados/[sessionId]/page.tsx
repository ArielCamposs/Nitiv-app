import { RadarResultsPage } from "@/components/radar/RadarResultsPage"

export default function ConvivenciaRadarResultados({ params }: { params: Promise<{ sessionId: string }> }) {
    return <RadarResultsPage params={params} role="convivencia" />
}
