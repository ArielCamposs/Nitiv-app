import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StudentEmotionChart } from "@/components/student/student-emotion-chart"

async function getStudentDashboardData() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: student } = await supabase
        .from("students")
        .select("id, institution_id, name, last_name")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) return null

    const { data: pointsAgg } = await supabase
        .from("points")
        .select("amount")
        .eq("student_id", student.id)

    const totalPoints = pointsAgg?.reduce((acc, p) => acc + (p.amount ?? 0), 0) ?? 0

    // ── Últimos 7 días de registros emocionales diarios ──
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentLogs } = await supabase
        .from("emotional_logs")
        .select("emotion, stress_level, anxiety_level, created_at")
        .eq("student_id", student.id)
        .eq("type", "daily")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true })

    // ── Lógica de la Tienda ──
    const { data: allCosmetics, error: cosError } = await supabase
        .from("cosmetics")
        .select("id, name, type, cost_points, image_url")
        .eq("active", true)

    if (cosError) {
        console.error("Error fetching cosmetics:", cosError)
    }

    const { data: ownedCosmetics, error: ownedError } = await supabase
        .from("student_cosmetics")
        .select("cosmetic_id")
        .eq("student_id", student.id)

    if (ownedError) {
        console.error("Error fetching owned cosmetics:", ownedError)
    }

    const ownedIds = new Set(ownedCosmetics?.map((o) => o.cosmetic_id) || [])
    const unownedCosmetics = (allCosmetics || []).filter((c) => !ownedIds.has(c.id))

    // Los que puede comprar (hasta 3 más baratos dentro de lo que le alcanza)
    const affordable = unownedCosmetics
        .filter((c) => c.cost_points <= totalPoints)
        .sort((a, b) => a.cost_points - b.cost_points)
        .slice(0, 3)

    // A los que casi llega (los más baratos que aún no le alcanzan, hasta 2)
    const nextGoals = unownedCosmetics
        .filter((c) => c.cost_points > totalPoints)
        .sort((a, b) => a.cost_points - b.cost_points)
        .slice(0, 2)

    return {
        student,
        totalPoints,
        recentLogs: recentLogs || [],
        affordable,
        nextGoals,
    }
}

export default async function EstudianteDashboardPage() {
    const data = await getStudentDashboardData()

    if (!data) {
        return <div>No se encontró tu perfil de estudiante.</div>
    }

    const {
        student,
        totalPoints,
        recentLogs,
        affordable,
        nextGoals,
    } = data

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Hola, {student.name}
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-amber-100 px-4 py-1 text-sm font-medium text-amber-700">
                            Puntos: {totalPoints}
                        </div>
                        <Link href="/estudiante/checkin" className="text-sm font-medium text-indigo-600 hover:underline">
                            Hacer Check-in
                        </Link>
                    </div>
                </div>

                {/* ── Resumen Emocional (Últimos 7 días) ── */}
                <section className="mt-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-slate-800">Tu semana emocional</CardTitle>
                            <CardDescription>Resumen de tus últimos 7 días de registros diarios</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentLogs.length === 0 ? (
                                <div className="py-8 text-center text-slate-500 text-sm">
                                    <p>Aún no tienes registros en los últimos 7 días.</p>
                                    <Link href="/estudiante/checkin" className="text-indigo-600 hover:underline mt-2 inline-block">
                                        ¡Haz tu check-in diario!
                                    </Link>
                                </div>
                            ) : (
                                <StudentEmotionChart logs={recentLogs} />
                            )}
                        </CardContent>
                    </Card>
                </section>

                {/* ── Avance en la Tienda ── */}
                <section className="mt-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-900">En la Tienda</h2>
                        <Link href="/estudiante/tienda" className="text-sm font-medium text-emerald-600 hover:underline">
                            Ir a la Tienda →
                        </Link>
                    </div>

                    {(affordable.length === 0 && nextGoals.length === 0) ? (
                        <Card className="border-dashed">
                            <CardContent className="py-6 text-center text-sm text-slate-400">
                                🏪 Aún no hay recompensas nuevas disponibles en tu tienda.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Lo que puede comprar ahora */}
                            {affordable.length > 0 && (
                                <Card className="border-emerald-100 bg-emerald-50/30">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-emerald-800 text-lg">¡Puedes canjearlos ahora!</CardTitle>
                                        <CardDescription className="text-emerald-600/80">Tienes los puntos necesarios</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {affordable.map((item) => (
                                                <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                                                    {item.image_url ? (
                                                        <div className="h-12 w-12 shrink-0 rounded-md bg-slate-100 overflow-hidden">
                                                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-12 w-12 shrink-0 rounded-md bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                                                            —
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-slate-800 truncate">{item.name}</p>
                                                        <p className="text-xs text-slate-500 capitalize">{item.type}</p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="text-sm font-bold text-emerald-600">{item.cost_points} pts</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <Link href="/estudiante/tienda" className="block w-full">
                                                <button className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
                                                    Ver tienda
                                                </button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Próximas metas */}
                            {nextGoals.length > 0 && (
                                <Card className="border-indigo-100 bg-indigo-50/30 h-fit">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-indigo-800 text-lg">Tus próximas metas</CardTitle>
                                        <CardDescription className="text-indigo-600/80">Sigue registrando para alcanzarlos</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {nextGoals.map((item) => {
                                                const faltan = Math.max(0, item.cost_points - totalPoints);
                                                const pct = Math.min(100, Math.round((totalPoints / item.cost_points) * 100));
                                                return (
                                                    <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
                                                        {item.image_url ? (
                                                            <div className="h-12 w-12 shrink-0 rounded-md bg-slate-100 overflow-hidden">
                                                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover grayscale opacity-80" />
                                                            </div>
                                                        ) : (
                                                            <div className="h-12 w-12 shrink-0 rounded-md bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                                                                —
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <p className="font-semibold text-sm text-slate-800 truncate">{item.name}</p>
                                                                <p className="text-xs font-medium text-slate-500">{item.cost_points} pts</p>
                                                            </div>
                                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-1 text-right">
                                                                Te faltan {faltan} pts
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </section>

            </div>
        </main>
    )
}
