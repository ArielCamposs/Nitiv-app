import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Clock, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { TemplateViewer } from "@/components/biblioteca/template-viewer"
import { TemplatePreview } from "@/components/biblioteca/template-preview"
import { PrintButton } from "@/components/biblioteca/print-button"
import { FinishActivityModal } from "@/components/biblioteca/finish-activity-modal"
import { ActivityResultsTab } from "@/components/biblioteca/activity-results-tab"
import { BibliotecaAdminActions } from "@/components/biblioteca/biblioteca-admin-actions"
import { createClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return notFound()

    const { data: dbUser } = await supabase
        .from("users")
        .select("role, institution_id")
        .eq("id", user.id)
        .single()

    const institutionId = dbUser?.institution_id
    const userRole = dbUser?.role

    if (userRole === "admin") redirect("/")

    if (!institutionId) return notFound()

    const { data: institution } = await supabase
        .from("institutions")
        .select("name")
        .eq("id", institutionId)
        .maybeSingle()

    const { data: activity } = await supabase
        .from("biblioteca_activities")
        .select("*")
        .eq("id", id)
        .eq("institution_id", institutionId)
        .single()

    if (!activity) {
        notFound()
    }

    let courses: any[] = []

    if (institutionId) {
        let query = supabase
            .from("courses")
            .select("id, name, level")
            .eq("institution_id", institutionId)
            .eq("active", true)
            .order("level", { ascending: true })
            .order("name", { ascending: true })

        // Filter for teachers so they only see their assigned courses
        if (userRole === "docente") {
            const { data: enrollments } = await supabase
                .from("course_teachers")
                .select("course_id")
                .eq("teacher_id", user.id)

            const courseIds = enrollments?.map(e => e.course_id) || []
            if (courseIds.length > 0) {
                query = query.in("id", courseIds)
            } else {
                // No courses assigned, ensure query returns empty
                query = query.eq("id", "00000000-0000-0000-0000-000000000000")
            }
        }

        const { data } = await query
        courses = data || []
    }

    return (
        <main className="min-h-screen bg-slate-50 print:bg-white print:min-h-0">
            {/* Header / Nav (Hidden when printing) */}
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 print:hidden">
                <Link
                    href="/biblioteca"
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a la Biblioteca
                </Link>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                            {activity.eje}
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {activity.title}
                        </h1>
                        <p className="text-lg text-slate-600">
                            {activity.objective}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium pt-2">
                            <Clock className="w-4 h-4" />
                            Duración estimada: {activity.duration_info}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                        {userRole === "docente" && (
                            <FinishActivityModal
                                activityId={activity.id}
                                activityTitle={activity.title}
                                courses={courses}
                            />
                        )}
                        {/* We use the extracted client component to trigger window.print() */}
                        {activity.template !== "none" && (
                            <PrintButton institutionName={institution?.name} />
                        )}
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="guia" className="w-full pt-4">
                    <TabsList className={`mb-6 grid w-full md:w-[400px] ${userRole === "docente" ? "grid-cols-2" : "grid-cols-1"}`}>
                        <TabsTrigger value="guia">Guía del Docente</TabsTrigger>
                        {userRole === "docente" && (
                            <TabsTrigger value="resultados">Resultados del Curso</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="guia">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Guía Docente (Left/Main section) */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* Rompehielo */}
                                <Card className="border-l-4 border-amber-400">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-slate-800">1. Rompehielo</h3>
                                            <span className="text-sm font-medium px-2.5 py-1 bg-slate-100 rounded-full text-slate-600">{activity.content.rompehielo.time}</span>
                                        </div>
                                        <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                                            {activity.content.rompehielo.text}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Desarrollo */}
                                <Card className="border-l-4 border-indigo-500">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-slate-800">2. Desarrollo</h3>
                                            <span className="text-sm font-medium px-2.5 py-1 bg-slate-100 rounded-full text-slate-600">{activity.content.desarrollo.time}</span>
                                        </div>
                                        <p className="text-slate-600 mb-4 font-medium text-sm md:text-base">
                                            {activity.content.desarrollo.intro}
                                        </p>
                                        <ol className="space-y-4">
                                            {activity.content.desarrollo.steps.map((step: string, idx: number) => (
                                                <li key={idx} className="flex gap-4 text-slate-600 text-sm md:text-base">
                                                    <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs mt-0.5">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="whitespace-pre-wrap leading-relaxed">
                                                        {step}
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    </CardContent>
                                </Card>

                                {/* Cierre */}
                                <Card className="border-l-4 border-emerald-500">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-slate-800">3. Cierre Reflexivo</h3>
                                            <span className="text-sm font-medium px-2.5 py-1 bg-slate-100 rounded-full text-slate-600">{activity.content.cierre.time}</span>
                                        </div>
                                        <p className="text-slate-600 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                                            {activity.content.cierre.text}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Ticket de Salida */}
                                <div className="bg-slate-800 text-white rounded-xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Info className="w-5 h-5 text-indigo-400" />
                                        <h3 className="font-semibold text-lg">Ticket de Salida Nitiv</h3>
                                    </div>
                                    <p className="text-slate-300 text-sm md:text-base">{activity.content.ticketSalida}</p>
                                </div>
                            </div>

                            {/* Right section info */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl p-5 border shadow-sm">
                                    <h3 className="font-semibold text-slate-800 mb-3">Acerca de la Plantilla</h3>
                                    <TemplatePreview type={activity.template} />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {userRole === "docente" && (
                        <TabsContent value="resultados">
                            <ActivityResultsTab activityId={activity.id} teacherId={user?.id || ""} />
                        </TabsContent>
                    )}
                </Tabs>
            </div>

            {/* Template Viewer (Hidden on screen, shown ONLY during print via CSS) */}
            {activity.template !== "none" && (
                <div id="print-area" className="hidden print:block absolute inset-0 bg-white">
                    <TemplateViewer type={activity.template} title={activity.title} />
                </div>
            )}
        </main>
    )
}
