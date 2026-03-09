import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RecursosClient } from "@/components/recursos/RecursosClient"
import type { Recurso, Etiqueta } from "@/components/recursos/RecursosClient"

const ALLOWED_ROLES = [
    "admin", "director", "inspector", "utp",
    "convivencia", "dupla", "docente",
    "estudiante", "centro_alumnos",
]
const UPLOAD_ROLES = ["admin", "docente", "dupla", "convivencia"]

export default async function RecursosPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return redirect("/login")
    if (!ALLOWED_ROLES.includes(profile.role)) return redirect("/")

    const STAFF_ROLES = ["admin", "docente", "dupla", "director", "inspector", "utp", "convivencia"]
    const isAdmin = profile.role === "admin"
    const isStaff = STAFF_ROLES.includes(profile.role)
    const canUpload = UPLOAD_ROLES.includes(profile.role)

    let resources: Recurso[] = []
    let allEtiquetas: Etiqueta[] = []

    try {
        let query = supabase
            .from("resources")
            .select(`
                id, title, body, tipo, categoria, file_url, file_name, file_size, file_mime,
                destacado, rol_destino, created_at, updated_at, active, created_by,
                recurso_etiqueta ( etiqueta_id, etiquetas ( id, nombre ) ),
                users!resources_created_by_fkey ( name, last_name, role )
            `)
            .eq("institution_id", profile.institution_id)
            .order("created_at", { ascending: false })

        if (!isAdmin) {
            query = (query as any).eq("active", true)
            
            // Si no es staff (ej: estudiante), filtramos por rol_destino
            if (!isStaff) {
                query = (query as any).contains("rol_destino", [profile.role])
            }
        }

        const [resourcesRes, etiquetasRes] = await Promise.all([
            query,
            supabase
                .from("etiquetas")
                .select("id, nombre")
                .eq("institution_id", profile.institution_id)
                .order("nombre"),
        ])

        resources = (resourcesRes.data ?? []).map((r: any) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            tipo: r.tipo,
            categoria: r.categoria ?? "general",
            file_url: r.file_url,
            file_name: r.file_name,
            file_size: r.file_size,
            file_mime: r.file_mime,
            destacado: r.destacado,
            rol_destino: r.rol_destino ?? [],
            created_at: r.created_at,
            updated_at: r.updated_at,
            created_by: r.created_by,
            etiquetas: (r.recurso_etiqueta ?? [])
                .filter((re: any) => re.etiquetas)
                .map((re: any) => re.etiquetas as Etiqueta),
            creator_name: r.users
                ? [r.users.name, r.users.last_name].filter(Boolean).join(" ")
                : undefined,
            creator_role: r.users?.role,
        }))

        allEtiquetas = (etiquetasRes.data ?? []).map((e: any) => ({
            id: e.id, nombre: e.nombre,
        }))
    } catch (err) {
        console.error("[recursos/page] Error fetching data:", err)
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Recursos</h1>
                    <p className="text-slate-500 text-sm mt-1">Material de apoyo para toda la comunidad escolar.</p>
                </div>
                <RecursosClient
                    initialResources={resources}
                    allEtiquetas={allEtiquetas}
                    canUpload={canUpload}
                    isAdmin={isAdmin}
                    userId={user.id}
                    institutionId={profile.institution_id}
                />
            </div>
        </main>
    )
}
