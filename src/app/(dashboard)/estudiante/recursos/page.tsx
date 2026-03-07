import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Download } from "lucide-react"

const CATEGORIAS_CONFIG: Record<string, { label: string; color: string }> = {
    general: { label: "General", color: "text-slate-700 bg-slate-100 border-slate-200" },
    socioemocional: { label: "Socioemocional", color: "text-blue-700 bg-blue-100 border-blue-200" },
    pedagogico: { label: "Pedagógico", color: "text-emerald-700 bg-emerald-100 border-emerald-200" },
    orientacion: { label: "Orientación", color: "text-violet-700 bg-violet-100 border-violet-200" },
    apoyo_pie: { label: "Apoyo PIE", color: "text-amber-700 bg-amber-100 border-amber-200" },
    familia: { label: "Familia", color: "text-rose-700 bg-rose-100 border-rose-200" },
}

export default async function RecursosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id) redirect("/login")

    const { data: resources } = await supabase
        .from("resources")
        .select("id, title, body, categoria, file_url, created_at")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .contains("rol_destino", [profile.role])
        .order("created_at", { ascending: false })

    // Agrupar por categoría
    const grouped = (resources ?? []).reduce((acc: Record<string, any[]>, r: any) => {
        const cat = r.categoria || "general"
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(r)
        return acc
    }, {})

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Recursos</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Guías, materiales y recursos de bienestar para ti
                    </p>
                </div>

                {(resources ?? []).length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="py-12 text-center text-slate-400">
                            <BookOpen className="mx-auto h-8 w-8 mb-3 opacity-40" />
                            <p className="text-sm">Aún no hay recursos publicados.</p>
                        </CardContent>
                    </Card>
                )}

                {Object.entries(grouped).map(([categoria, items]) => (
                    <section key={categoria} className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            {CATEGORIAS_CONFIG[categoria]?.label ?? categoria}
                        </h2>
                        {items.map((resource: any) => {
                            const catCfg = CATEGORIAS_CONFIG[resource.categoria || "general"]
                            return (
                                <Card key={resource.id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-base">{resource.title}</CardTitle>
                                            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider shrink-0 ${catCfg?.color}`}>
                                                {catCfg?.label ?? resource.categoria}
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-xs">
                                            {new Date(resource.created_at).toLocaleDateString("es-CL", {
                                                day: "numeric", month: "long", year: "numeric"
                                            })}
                                        </CardDescription>
                                    </CardHeader>
                                    {(resource.body || resource.file_url) && (
                                        <CardContent className="space-y-3">
                                            {resource.body && (
                                                <p className="text-sm text-slate-600">{resource.body}</p>
                                            )}
                                            {resource.file_url && (
                                                <a
                                                    href={resource.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Descargar archivo
                                                </a>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>
                            )
                        })}
                    </section>
                ))}
            </div>
        </main>
    )
}
