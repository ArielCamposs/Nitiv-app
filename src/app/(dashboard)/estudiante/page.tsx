import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Calendar, Clock, MapPin, PartyPopper, Star, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

function computeStatus(start: string, end: string) {
    const now = new Date()
    if (now < new Date(start)) return "programada"
    if (now > new Date(end)) return "finalizada"
    return "en_desarrollo"
}

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
        .select("id, institution_id, name, last_name, course_id")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) return null

    const { data: pointsAgg } = await supabase
        .from("points")
        .select("amount")
        .eq("student_id", student.id)

    const totalPoints = pointsAgg?.reduce((acc, p) => acc + (p.amount ?? 0), 0) ?? 0

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

    const affordable = unownedCosmetics
        .filter((c) => c.cost_points <= totalPoints)
        .sort((a, b) => a.cost_points - b.cost_points)
        .slice(0, 3)

    // ── Actividades y Evaluaciones Pendientes ──
    const { data: allActivities } = await supabase
        .from("activities")
        .select(`
            id, title, description, start_datetime, end_datetime, target, activity_type, title_color, origin, header_image, location,
            activity_courses(course_id)
        `)
        .eq("institution_id", student.institution_id)
        .eq("active", true)
        .order("start_datetime", { ascending: true })

    const myCourseIds = student.course_id ? [student.course_id] : []
    const myActivities = (allActivities || []).filter(a => {
        if (a.target === "general") return true
        if (myCourseIds.length === 0) return false
        const activityCourseIds = (a.activity_courses ?? []).map((ac: any) => ac.course_id)
        return activityCourseIds.some((id: string) => myCourseIds.includes(id))
    })

    const { data: myRatings } = await supabase
        .from("activity_ratings")
        .select("activity_id")
        .eq("rated_by", student.id)

    const ratedIds = new Set(myRatings?.map((r) => r.activity_id) || [])

    let upcomingActivity = null
    const pendingEvaluations = []

    for (const a of myActivities) {
        const status = computeStatus(a.start_datetime, a.end_datetime)
        if (status === "programada" || status === "en_desarrollo") {
            if (!upcomingActivity) upcomingActivity = a
        } else if (status === "finalizada") {
            if (!ratedIds.has(a.id)) {
                pendingEvaluations.push(a)
            }
        }
    }
    const limitedPendingEvals = pendingEvaluations.slice(-2).reverse() // Mostrar las 2 más recientes finalizadas

    // A los que casi llega (los más baratos que aún no le alcanzan, hasta 2)
    const nextGoals = unownedCosmetics
        .filter((c) => c.cost_points > totalPoints)
        .sort((a, b) => a.cost_points - b.cost_points)
        .slice(0, 2)

    return {
        student,
        totalPoints,
        affordable,
        nextGoals,
        upcomingActivity,
        pendingEvaluations: limitedPendingEvals,
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
        affordable,
        nextGoals,
        upcomingActivity,
        pendingEvaluations,
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

                {/* ── Actividades ── */}
                <section className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-900">Actividades</h2>
                        <Link href="/estudiante/actividades" className="text-sm font-medium text-emerald-600 hover:underline">
                            Ir al catálogo →
                        </Link>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Próxima Actividad o en desarrollo */}
                        <div className="flex flex-col h-full">
                            {upcomingActivity ? (() => {
                                const a = upcomingActivity
                                const status = computeStatus(a.start_datetime, a.end_datetime)
                                const isActive = status === "en_desarrollo"
                                const isExternal = a.origin === "externa"
                                return (
                                    <Card className={cn("overflow-hidden flex flex-col h-full transition-shadow", isActive ? "border-emerald-500 ring-2 ring-emerald-500 ring-offset-2" : "border-slate-200 shadow-sm hover:shadow-md")}>
                                        <div className={cn("relative h-32 w-full shrink-0 flex items-center justify-center", a.header_image ? "" : "bg-indigo-50 border-b border-indigo-100")}>
                                            {a.header_image ? (
                                                <img src={a.header_image} alt={a.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <PartyPopper className={cn("w-10 h-10 text-indigo-300", isActive && "text-emerald-400 animate-pulse")} />
                                            )}
                                            {/* Badge flotante */}
                                            <div className="absolute top-3 left-3 z-10">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm uppercase tracking-wider backdrop-blur-md",
                                                    isActive ? "bg-emerald-500/90 text-white border-emerald-600" : "bg-white/90 text-indigo-700 border-indigo-100"
                                                )}>
                                                    {isActive ? "En desarrollo" : "Próxima"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 flex flex-col flex-1 bg-white">
                                            <h3 className="text-[15px] font-bold text-slate-800 line-clamp-2 mb-3 leading-snug">{a.title}</h3>

                                            <div className="space-y-1.5 mt-auto mb-4 text-[13px] font-medium text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                                    {new Date(a.start_datetime).toLocaleDateString("es-CL", { day: 'numeric', month: 'long' })}
                                                    <span className="text-slate-300">·</span>
                                                    {new Date(a.start_datetime).toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {a.location && (
                                                    <div className="flex items-center gap-2 truncate">
                                                        <MapPin className={cn("w-4 h-4 shrink-0", isExternal ? "text-rose-400" : "text-slate-400")} />
                                                        <span className="truncate">{a.location}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <Link href="/estudiante/actividades" className="w-full mt-auto">
                                                <button type="button" className={cn("w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-colors shadow-sm", isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100")}>
                                                    {isActive ? "Entrar a la actividad" : "Ver detalles"}
                                                </button>
                                            </Link>
                                        </div>
                                    </Card>
                                )
                            })() : (
                                <Card className="border-dashed bg-transparent shadow-none border-slate-200 h-full flex items-center justify-center min-h-[220px]">
                                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                                        <PartyPopper className="w-8 h-8 text-slate-300 mb-3" />
                                        <p className="text-sm font-medium text-slate-500">No hay actividades<br />programadas por ahora.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Evaluaciones pendientes */}
                        <Card className="shadow-sm border-amber-200 bg-amber-50/30 flex flex-col h-full overflow-hidden">
                            <CardHeader className="pb-3 border-b border-amber-100/50 bg-amber-50/50">
                                <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    Danos tu opinión
                                </CardTitle>
                                <CardDescription className="text-amber-700/80 text-xs text-balance">
                                    ¡Gana puntos evaluando estas actividades finalizadas!
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col justify-start">
                                {pendingEvaluations.length > 0 ? (
                                    <div className="space-y-3 w-full">
                                        {pendingEvaluations.map(a => (
                                            <div key={a.id} className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-xs flex flex-col gap-2.5 transition-all hover:border-amber-300 hover:shadow-sm">
                                                <h4 className="text-[13px] font-bold text-slate-800 line-clamp-1 leading-snug">{a.title}</h4>
                                                <Link href="/estudiante/actividades" className="w-full">
                                                    <button className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 py-1.5 rounded-lg transition-colors">
                                                        Evaluar ahora <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                                    </button>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                                            <ShieldAlert className="w-5 h-5 text-emerald-500 hidden" />
                                            <span className="text-xl">🎉</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700 mb-1">¡Estás al día!</p>
                                        <p className="text-xs text-slate-500">No tienes evaluaciones pendientes.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
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
