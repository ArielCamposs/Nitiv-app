import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ActivityForm } from "@/components/biblioteca/activity-form"

// Role guard function
async function checkAuth() {
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

    if (!institutionId || role === "admin") {
        redirect("/") // Admin is not allowed to create biblioteca activities
    }

    return institutionId
}

export default async function NuevaActividadPage() {
    const institutionId = await checkAuth()

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Nueva Actividad</h1>
                    <p className="text-slate-500">
                        Crea una nueva actividad o plantilla para la biblioteca de tu institución.
                    </p>
                </div>

                <ActivityForm institutionId={institutionId} />
            </div>
        </main>
    )
}
