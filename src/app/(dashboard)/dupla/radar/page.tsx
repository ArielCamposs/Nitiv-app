import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RadarManagerClient, type CourseWithSessions, type SessionInfo } from "@/components/radar/RadarManagerClient"
import { Radar, Info } from "lucide-react"
import type { RadarPeriod } from "@/actions/radar"

export default async function DuplaRadarPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect("/login")

    const { data: profile } = await supabase
        .from("users").select("role, institution_id").eq("id", user.id).single()
    if (!profile?.institution_id || profile.role !== "dupla") return redirect("/dupla")

    const iid = profile.institution_id

    const [{ data: courses }, { data: sessions }, { data: allResponses }] = await Promise.all([
        supabase.from("courses").select("id, name, section").eq("institution_id", iid).eq("active", true).order("name"),
        supabase.from("radar_sessions").select("id, course_id, period, active, activated_at").eq("institution_id", iid).order("activated_at", { ascending: false }),
        supabase.from("radar_responses").select("session_id").eq("institution_id", iid),
    ])

    // Count responses per session
    const countBySession = new Map<string, number>()
    for (const r of allResponses ?? []) {
        countBySession.set(r.session_id, (countBySession.get(r.session_id) ?? 0) + 1)
    }

    // Build courses with sessions
    const coursesWithSessions: CourseWithSessions[] = (courses ?? []).map(c => ({
        id: c.id,
        name: c.name,
        section: c.section,
        sessions: (sessions ?? [])
            .filter(s => s.course_id === c.id)
            .map(s => ({
                id: s.id,
                period: s.period as RadarPeriod,
                active: s.active,
                activated_at: s.activated_at,
                response_count: countBySession.get(s.id) ?? 0,
            } satisfies SessionInfo)),
    }))

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Radar className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-semibold text-slate-900">Radar de Competencias</h1>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        Activa el cuestionario por curso y período. Los estudiantes solo podrán responder cuando esté activo.
                    </p>
                </div>

                <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3.5">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-indigo-700">
                        Selecciona el período (inicio o término de semestre) antes de activar. Cada período se registra por separado para hacer seguimiento a lo largo del año.
                    </p>
                </div>

                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">Cursos</h2>
                    <RadarManagerClient courses={coursesWithSessions} institutionId={iid} role="dupla" />
                </section>
            </div>
        </main>
    )
}
