import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ActivityForm } from "@/components/biblioteca/activity-form"

// Role guard function
async function checkAuth(activityId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: dbUser } = await supabase
        .from("users")
        .select("role, institution_id")
        .eq("id", user.id)
        .single()

    const role = dbUser?.role
    const institutionId = dbUser?.institution_id

    if (!institutionId || role !== "admin") {
        redirect("/biblioteca") // Unauthorized
    }

    // Check if the activity belongs to this institution
    const { data: activity } = await supabase
        .from("biblioteca_activities")
        .select("*")
        .eq("id", activityId)
        .eq("institution_id", institutionId)
        .single()

    if (!activity) {
        notFound()
    }

    return { institutionId, activity }
}

export default async function EditarActividadPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { institutionId, activity } = await checkAuth(id)

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Editar Actividad</h1>
                    <p className="text-slate-500">
                        Modifica los detalles o el contenido de esta actividad.
                    </p>
                </div>

                <ActivityForm initialData={activity} institutionId={institutionId} />
            </div>
        </main>
    )
}
