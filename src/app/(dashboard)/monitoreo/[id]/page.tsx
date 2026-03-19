import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { CasoDetailClient } from "@/components/casos/caso-detail-client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function MonitoreoDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return redirect("/login")

    // Solo roles autorizados
    const { data: profile } = await supabase
        .from("users")
        .select("role, institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return redirect("/login")

    const { data: caso, error: casoError } = await supabase
        .from("student_cases")
        .select(`
            id, reason, initial_state, status, next_step, next_step_date, created_at, created_by, responsable_id,
            when_occurs, frequency, derived_to,
            students (id, name, last_name, courses(name, section)),
            creador:users!created_by (name, last_name, role),
            responsable:users!responsable_id (name, last_name, role)
        `)
        .eq("id", id)
        .eq("institution_id", profile.institution_id)
        .maybeSingle()

    if (casoError) {
        console.error("ERROR FETCHING CASO", casoError)
    }

    if (!caso) {
        console.error("CASO NOT FOUND PARA ID:", id)
        return notFound()
    }

    const { data: actions, error: actError } = await supabase
        .from("student_case_actions")
        .select(`
            id, action_type, description, created_at,
            users (name, last_name, role)
        `)
        .eq("case_id", id)
        .order("created_at", { ascending: false })
    
    if (actError) console.error("ERROR FETCHING ACTIONS", actError)

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div>
                    <Link href="/monitoreo">
                        <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a bandeja
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Detalle de Derivación
                    </h1>
                </div>

                <CasoDetailClient 
                    caso={caso} 
                    initialActions={actions ?? []} 
                    userId={user.id} 
                    userRole={profile.role} 
                />
            </div>
        </main>
    )
}
