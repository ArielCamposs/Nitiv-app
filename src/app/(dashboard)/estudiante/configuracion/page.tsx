import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentEmotionChart } from "@/components/student/student-emotion-chart"

const EMOTION_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    muy_bien: { label: "Muy bien", emoji: "🤩", color: "bg-purple-100 text-purple-700" },
    bien: { label: "Bien", emoji: "🙂", color: "bg-emerald-100 text-emerald-700" },
    neutral: { label: "Neutral", emoji: "😐", color: "bg-slate-100 text-slate-600" },
    mal: { label: "Mal", emoji: "😢", color: "bg-orange-100 text-orange-600" },
    muy_mal: { label: "Muy mal", emoji: "😞", color: "bg-red-100 text-red-600" },
}

const LEVEL_NAMES: Record<number, string> = {
    1: "Principiante", 2: "Explorador", 3: "Reflexivo",
    4: "Consciente", 5: "Empático", 6: "Maestro",
}

export default async function ConfiguracionEstudiantePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: student } = await supabase
        .from("students")
        .select(`
            id, name, last_name, rut, birthdate,
            guardian_name, guardian_phone, guardian_email,
            created_at,
            course:course_id ( name, level ),
            institution:institution_id ( name )
        `)
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) redirect("/login")

    const { data: userProfile } = await supabase
        .from("users")
        .select("email, avatar_url")
        .eq("id", user.id)
        .maybeSingle()

    // Puntos y nivel
    const { data: pointsData } = await supabase
        .from("points")
        .select("amount")
        .eq("student_id", student.id)

    const totalPoints = (pointsData ?? []).reduce((a, p) => a + (p.amount ?? 0), 0)
    const level = Math.min(Math.floor(totalPoints / 100) + 1, 6)

    // Cosmético equipado
    const { data: equippedCosmetic } = await supabase
        .from("student_cosmetics")
        .select("cosmetics(name, type, image_url)")
        .eq("student_id", student.id)
        .eq("equipped", true)
        .maybeSingle()

    // Últimos 30 días de emociones para el heatmap
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentLogs } = await supabase
        .from("emotional_logs")
        .select("emotion, stress_level, anxiety_level, reflection, type, created_at")
        .eq("student_id", student.id)
        .eq("type", "daily")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true })

    const age = student.birthdate
        ? Math.floor((Date.now() - new Date(student.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

    const cosmeticData = (equippedCosmetic?.cosmetics as any)

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                {/* Header (Siempre visible) */}
                <Card className="bg-linear-to-br from-indigo-50 to-purple-50 border-0 shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-5">
                            {/* Avatar / inicial */}
                            <div className="relative">
                                {cosmeticData?.image_url ? (
                                    <img
                                        src={cosmeticData.image_url}
                                        alt="Avatar"
                                        className="h-20 w-20 rounded-full object-cover ring-4 ring-indigo-200"
                                    />
                                ) : (
                                    <div className="h-20 w-20 rounded-full bg-indigo-200 flex items-center justify-center text-2xl font-bold text-indigo-700 ring-4 ring-indigo-100">
                                        {student.name[0]}{student.last_name[0]}
                                    </div>
                                )}
                                <span className="absolute -bottom-1 -right-1 bg-white text-xs font-bold text-indigo-600 border border-indigo-200 rounded-full px-1.5 py-0.5">
                                    Nv.{level}
                                </span>
                            </div>

                            <div className="flex-1">
                                <h1 className="text-xl font-bold text-slate-900">
                                    {student.name} {student.last_name}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    {(student.course as any)?.name ?? "Sin curso"} · {(student.institution as any)?.name}
                                </p>
                                <Badge variant="outline" className="mt-1 text-xs border-indigo-300 text-indigo-600">
                                    {LEVEL_NAMES[level] ?? "Experto"}
                                </Badge>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-3xl font-bold text-indigo-600">{totalPoints}</p>
                                <p className="text-xs text-slate-500">puntos totales</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {recentLogs?.length ?? 0} registros esta semana
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contenido Separado en Pestañas */}
                <Tabs defaultValue="configuracion" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="configuracion">Configuración</TabsTrigger>
                        <TabsTrigger value="emocional">Emocional</TabsTrigger>
                    </TabsList>

                    {/* VISTA 1: CONFIGURACION */}
                    <TabsContent value="configuracion" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Datos personales</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                {[
                                    { label: "RUT", value: student.rut ?? "No registrado" },
                                    { label: "Edad", value: age ? `${age} años` : "No registrada" },
                                    { label: "Correo", value: userProfile?.email ?? "No registrado" },
                                    { label: "Miembro desde", value: new Date(student.created_at).toLocaleDateString("es-CL") },
                                ].map((item) => (
                                    <div key={item.label}>
                                        <p className="text-xs text-slate-400">{item.label}</p>
                                        <p className="font-medium text-slate-700">{item.value}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* VISTA 2: EMOCIONAL */}
                    <TabsContent value="emocional" className="mt-6 space-y-6">
                        {/* Gráfico emocional últimos 7 días */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Evolución emocional — últimos 30 días</CardTitle>
                                <CardDescription>Emoción, estrés y ansiedad diarios</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {(recentLogs ?? []).length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        Aún no hay registros esta semana.
                                    </p>
                                ) : (
                                    <StudentEmotionChart logs={recentLogs ?? []} />
                                )}
                            </CardContent>
                        </Card>

                        {/* Lista últimos 7 registros */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Registros recientes</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y">
                                {(recentLogs ?? []).slice(-7).reverse().map((log, i) => {
                                    const cfg = EMOTION_CONFIG[log.emotion] ?? EMOTION_CONFIG.neutral
                                    return (
                                        <div key={i} className="flex items-start gap-3 py-3">
                                            <span className="text-2xl">{cfg.emoji}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        😰 Estrés: {log.stress_level ?? "—"}/5
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        😟 Ansiedad: {log.anxiety_level ?? "—"}/5
                                                    </span>
                                                </div>
                                                {log.reflection && (
                                                    <p className="text-xs text-slate-500 mt-1 truncate">
                                                        {log.reflection}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                        weekday: "long", day: "numeric", month: "long",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </main>
    )
}
