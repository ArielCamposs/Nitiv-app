import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const ROLE_LABEL: Record<string, string> = {
    docente: "Docente",
    dupla: "Dupla Psicosocial",
    convivencia: "Convivencia",
    director: "Director",
    inspector: "Inspector",
    utp: "UTP",
    admin: "Administrador"
}

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: targetId } = await params
    const supabase = await createClient()

    // 1. Get current logged-in user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return redirect("/login")

    const { data: currentProfile } = await supabase
        .from("users")
        .select("role, institution_id")
        .eq("id", currentUser.id)
        .single()

    if (!currentProfile) return redirect("/login")

    const currentRole = currentProfile.role

    // 2. Check if target ID is a student
    const { data: studentCheck } = await supabase
        .from("students")
        .select("id")
        .eq("id", targetId)
        .maybeSingle()

    if (studentCheck) {
        // Redirigir a la vista de estudiante apropiada según el rol actual
        if (["estudiante", "apoderado", "admin"].includes(currentRole)) {
            // Handle these cases if needed, otherwise fallback to admin or similar
            if (currentRole === "admin") return redirect(`/admin/estudiantes/${targetId}`)
        }

        switch (currentRole) {
            case "docente":
                return redirect(`/docente/estudiantes/${targetId}`)
            case "dupla":
                return redirect(`/dupla/estudiantes/${targetId}`)
            case "convivencia":
                return redirect(`/convivencia/estudiantes/${targetId}`)
            case "director":
                return redirect(`/director/estudiantes/${targetId}`)
            case "utp":
                return redirect(`/utp/estudiantes/${targetId}`)
            case "inspector":
                return redirect(`/inspector/estudiantes/${targetId}`)
            default:
                return notFound() // or redirect to a default layout if implemented
        }
    }

    // 3. Otherwise, target ID should be a staff member (user)
    const { data: targetUser } = await supabase
        .from("users")
        .select("id, name, last_name, email, role, phone, active, created_at, institution_id")
        .eq("id", targetId)
        .maybeSingle()

    if (!targetUser) return notFound()

    // Prevent viewing users from other institutions unless admin
    if (currentRole !== "admin" && targetUser.institution_id !== currentProfile.institution_id) {
        return notFound()
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                {/* Encabezado del perfil */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            {targetUser.name} {targetUser.last_name ?? ""}
                        </h1>
                        <p className="text-sm text-slate-500 capitalize">
                            {ROLE_LABEL[targetUser.role] ?? targetUser.role}
                        </p>
                    </div>
                </div>

                {/* Datos básicos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>Datos del usuario</span>
                            <Badge variant={targetUser.active ? "default" : "secondary"} className={targetUser.active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                                {targetUser.active ? "Activo" : "Inactivo"}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-slate-400">Email</p>
                            <p className="font-medium text-slate-700">{targetUser.email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Teléfono</p>
                            <p className="font-medium text-slate-700">{targetUser.phone ?? "No registrado"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Fecha de ingreso</p>
                            <p className="font-medium text-slate-700">
                                {new Date(targetUser.created_at).toLocaleDateString("es-CL")}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Rol en sistema</p>
                            <p className="font-medium text-slate-700 capitalize">
                                {ROLE_LABEL[targetUser.role] ?? targetUser.role}
                            </p>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </main>
    )
}
