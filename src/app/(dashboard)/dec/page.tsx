import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DecPageTabs } from "@/components/dec/dec-page-tabs"
import { MarkDecSeen } from "@/components/dec/mark-dec-seen"
import { getDecStats } from "@/lib/dec-stats"

async function getDecCases() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return null

    // Permite todos los roles excepto estudiante y centro_alumnos
    const allowedRoles = ["dupla", "convivencia", "docente", "director", "inspector", "utp", "pie", "admin"]
    if (!allowedRoles.includes(profile.role)) {
        return null // No tiene acceso
    }

    const [casesRes, decStats] = await Promise.all([
        supabase
            .from("incidents")
            .select(`
                id,
                folio,
                type,
                severity,
                location,
                incident_date,
                end_date,
                resolved,
                students (
                    id,
                    name,
                    last_name,
                    courses ( name )
                ),
                users!reporter_id (
                    name,
                    last_name,
                    role
                ),
                incident_recipients (
                    id,
                    recipient_id,
                    seen,
                    seen_at,
                    role
                )
            `)
            .eq("institution_id", profile.institution_id)
            .order("incident_date", { ascending: false }),
        getDecStats(profile.institution_id),
    ])

    return { cases: casesRes.data ?? [], role: profile.role, userId: user.id, decStats }
}

export default async function DecPage() {
    const data = await getDecCases()
    if (!data) return <div>No tienes acceso a este módulo.</div>

    const { cases, role, userId, decStats } = data

    return (
        <main className="min-h-screen bg-slate-50">
            <MarkDecSeen />
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Registro DEC
                        </h1>
                        <p className="text-sm text-slate-500">
                            Desregulación Emocional y Conductual
                        </p>
                    </div>
                    {role !== "estudiante" && (
                        <Link href="/dec/nuevo">
                            <Button>+ Nuevo caso DEC</Button>
                        </Link>
                    )}
                </div>

                <DecPageTabs cases={cases as any} currentUserId={userId} userRole={role} decStats={decStats} />
            </div>
        </main>
    )
}
