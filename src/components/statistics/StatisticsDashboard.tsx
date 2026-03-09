"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OverviewSection } from "@/components/statistics/OverviewSection"
import { IncidentsSection } from "@/components/statistics/IncidentsSection"
import { ActivitiesSection } from "@/components/statistics/ActivitiesSection"
import { toast } from "sonner"
import { getDashboardData, DashboardData } from "@/actions/statistics/getDashboardData"

import { useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateStatisticsReport } from "@/app/(dashboard)/estadisticas/export-pdf"
import Link from "next/link"
import { ClipboardList, ArrowRight } from "lucide-react"

type Props = { institutionId: string; institutionName: string; role?: string }

const RANGES = [
    { value: 30, label: "Últimos 30 días" },
    { value: 90, label: "Últimos 90 días" },
    { value: 365, label: "Últimos 365 días" },
]

export function StatisticsDashboard({ institutionId, institutionName, role }: Props) {
    const [days, setDays] = useState<number>(30)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<DashboardData | null>(null)
    const dashboardRef = useRef<HTMLDivElement>(null)

    const loadData = async (range: number) => {
        setLoading(true)
        try {
            const result = await getDashboardData(institutionId, range, role)
            if (result.error) {
                toast.error(result.error)
            } else {
                setData(result.data ?? null)
            }
        } catch (e) {
            console.error(e)
            toast.error("No se pudo cargar el dashboard.")
        } finally {
            setLoading(false)
        }
    }

    const handleExportPdf = async () => {
        if (!data) return

        try {
            setLoading(true)

            const pdf = await generateStatisticsReport({
                institutionName,
                days,
                summary: data.summary,
                convivenciaSummary: data.convivenciaSummary,
                emotionDistribution: data.emotionDistribution,
                courseRisks: data.courseRisks,
                incidents: data.incidents,
                activities: data.activities,
            })

            const filename = `informe-estadisticas-${days}d.pdf`
            pdf.save(filename)
            toast.success("Informe generado exitosamente")
        } catch (e) {
            console.error(e)
            toast.error("No se pudo generar el informe.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadData(days)
    }, [days, institutionId])

    const showConvivenciaHint = role === "dupla" || role === "convivencia"

    return (
        <div className="space-y-6">
            {/* Aviso dupla/convivencia: enlace a estadísticas de registros */}
            {showConvivenciaHint && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-800">
                    <p className="font-medium flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 shrink-0" />
                        Estadísticas de registros de convivencia
                    </p>
                    <p className="mt-1 text-indigo-700/90">
                        Para estadísticas detalladas por tipo, resolución y tendencias de casos, usa{" "}
                        <Link
                            href="/registros-convivencia"
                            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                        >
                            Registros de convivencia
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        {" "}→ pestaña <strong>Estadísticas</strong>.
                    </p>
                </div>
            )}

            {/* Selector de periodo + PDF */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {RANGES.map(r => (
                        <button
                            key={r.value}
                            disabled={loading}
                            onClick={() => setDays(r.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${days === r.value
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                } disabled:opacity-50`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || !data}
                    onClick={handleExportPdf}
                >
                    {loading ? "Procesando..." : "Descargar informe PDF"}
                </Button>
            </div>

            <div
                ref={dashboardRef}
                className="space-y-6"
            >
                {data ? (
                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="bg-slate-100/80 border border-slate-200 p-1 rounded-xl h-auto gap-0.5">
                            <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                                Resumen
                            </TabsTrigger>
                            <TabsTrigger value="incidents" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                                Incidentes DEC
                            </TabsTrigger>
                            <TabsTrigger value="activities" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                                Actividades
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-6">
                            <OverviewSection data={data} days={days} />
                        </TabsContent>

                        <TabsContent value="incidents" className="space-y-6 mt-6">
                            <IncidentsSection incidents={data.incidents} days={days} />
                        </TabsContent>

                        <TabsContent value="activities" className="space-y-6 mt-6">
                            <ActivitiesSection activities={data.activities} />
                        </TabsContent>
                    </Tabs>
                ) : (
                    <Card className="p-6 text-sm text-slate-500">
                        {loading ? "Cargando estadísticas..." : "No hay datos para el período seleccionado."}
                    </Card>
                )}
            </div>
        </div>
    )
}
