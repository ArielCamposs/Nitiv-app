import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Radar, ChevronRight, Users } from "lucide-react"

const PERIOD_LABELS: Record<string, string> = {
    inicio_s1: "Inicio S1", termino_s1: "Término S1",
    inicio_s2: "Inicio S2", termino_s2: "Término S2",
}

interface Props {
    institutionId: string
    role: "dupla" | "convivencia"
}

export async function RadarDashboardWidget({ institutionId, role }: Props) {
    const supabase = await createClient()

    // Active sessions with course info
    const { data: sessions } = await supabase
        .from("radar_sessions")
        .select("id, period, activated_at, course_id, courses(name, section)")
        .eq("institution_id", institutionId)
        .eq("active", true)
        .order("activated_at", { ascending: false })

    if (!sessions?.length) return null

    // Response counts per session
    const sessionIds = sessions.map(s => s.id)
    const { data: responses } = await supabase
        .from("radar_responses")
        .select("session_id")
        .in("session_id", sessionIds)

    const countBySession = new Map<string, number>()
    for (const r of responses ?? []) {
        countBySession.set(r.session_id, (countBySession.get(r.session_id) ?? 0) + 1)
    }

    return (
        <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-indigo-100 bg-indigo-50">
                <div className="flex items-center gap-2">
                    <Radar className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-800">Radar de Competencias activo</span>
                    <span className="text-[10px] font-bold bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full">
                        {sessions.length} curso{sessions.length > 1 ? "s" : ""}
                    </span>
                </div>
                <Link
                    href={`/${role}/radar`}
                    className="flex items-center gap-0.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    Ver todo <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Session rows */}
            <div className="divide-y divide-slate-100">
                {sessions.map(s => {
                    const course = (s as any).courses
                    const courseName = course
                        ? `${course.name}${course.section ? " " + course.section : ""}`
                        : "Curso"
                    const count = countBySession.get(s.id) ?? 0
                    const activatedDate = new Date(s.activated_at).toLocaleDateString("es-CL", {
                        day: "numeric", month: "short",
                    })

                    return (
                        <Link
                            key={s.id}
                            href={`/${role}/radar/resultados/${s.id}`}
                            className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Active dot */}
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{courseName}</p>
                                    <p className="text-xs text-slate-400">
                                        {PERIOD_LABELS[s.period] ?? s.period} · Desde {activatedDate}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="font-semibold">{count}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </div>
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}
