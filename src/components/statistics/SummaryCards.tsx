import { Card, CardContent } from "@/components/ui/card"
import { Heart, ShieldAlert, CalendarCheck, AlertTriangle } from "lucide-react"

type Summary = {
    total_emotion_logs: number
    total_incidents: number
    total_activities: number
    low_emotion_courses: number
}

const SUMMARY_ITEMS: { key: keyof Summary; label: string; icon: typeof Heart; bg: string; text: string }[] = [
    { key: "total_emotion_logs", label: "Registros emocionales", icon: Heart, bg: "bg-violet-50 border-violet-100", text: "text-violet-700" },
    { key: "total_incidents", label: "Incidentes DEC", icon: ShieldAlert, bg: "bg-amber-50 border-amber-100", text: "text-amber-700" },
    { key: "total_activities", label: "Actividades realizadas", icon: CalendarCheck, bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
    { key: "low_emotion_courses", label: "Cursos en riesgo", icon: AlertTriangle, bg: "bg-rose-50 border-rose-100", text: "text-rose-700" },
]

export function SummaryCards({ data }: { data: Summary }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SUMMARY_ITEMS.map(({ key, label, icon: Icon, bg, text }) => (
                <Card key={key} className={`border ${bg} overflow-hidden`}>
                    <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className={`text-2xl font-bold tabular-nums ${text}`}>
                                    {data[key] ?? "—"}
                                </p>
                                <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
                            </div>
                            <div className={`p-2 rounded-lg bg-white/80 border border-slate-100 shrink-0`}>
                                <Icon className={`w-5 h-5 ${text}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
