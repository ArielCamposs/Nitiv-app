import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"

type CourseRisk = {
    course_id: string
    course_name: string
    avg_score: number
    low_students: {
        student_id: string
        name: string
        avg_score: number
    }[]
}

const MAX_SCORE = 5
const RISK_THRESHOLD = 2.5

function scoreBarColor(score: number) {
    if (score < 2) return "bg-rose-500"
    if (score < RISK_THRESHOLD) return "bg-amber-500"
    return "bg-emerald-500"
}

function scoreLabelColor(score: number) {
    if (score < 2) return "text-rose-700 bg-rose-100 border-rose-200"
    if (score < RISK_THRESHOLD) return "text-amber-700 bg-amber-100 border-amber-200"
    return "text-emerald-700 bg-emerald-100 border-emerald-200"
}

export function RiskCoursesSection({ courses }: { courses: CourseRisk[] }) {
    if (courses.length === 0) {
        return (
            <Card className="border-slate-200/80">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-emerald-500" />
                        Cursos en riesgo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500 rounded-lg bg-slate-50 py-6 text-center">
                        No hay cursos en riesgo para el periodo seleccionado.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200/80 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-rose-50 to-amber-50 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Cursos en riesgo (promedio emocional bajo)
                </CardTitle>
                <p className="text-xs text-slate-500 font-normal mt-1">
                    Cursos con clima emocional bajo; se listan estudiantes con menor promedio.
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid md:grid-cols-2 gap-4">
                    {courses.map((c) => {
                        const pct = Math.min(100, (c.avg_score / MAX_SCORE) * 100)
                        return (
                            <div
                                key={c.course_id}
                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <p className="font-semibold text-sm text-slate-800 truncate">
                                        {c.course_name}
                                    </p>
                                    <span
                                        className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${scoreLabelColor(c.avg_score)}`}
                                    >
                                        {c.avg_score.toFixed(1)}
                                    </span>
                                </div>
                                <div className="mb-3">
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${scoreBarColor(c.avg_score)}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Promedio emocional (escala 1–5)
                                    </p>
                                </div>

                                {c.low_students.length === 0 ? (
                                    <p className="text-xs text-slate-400">
                                        Sin estudiantes con datos suficientes en este periodo.
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Estudiantes con promedio mas bajo
                                        </p>
                                        <ul className="space-y-1">
                                            {c.low_students.map((s) => (
                                                <li
                                                    key={s.student_id}
                                                    className="flex items-center justify-between text-xs gap-2"
                                                >
                                                    <span className="truncate text-slate-700">{s.name}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-700 bg-amber-50 shrink-0"
                                                    >
                                                        {s.avg_score.toFixed(1)}
                                                    </Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
