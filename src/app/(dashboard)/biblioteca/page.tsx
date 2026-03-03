import Link from "next/link"
import { ArrowRight, Clock, Target } from "lucide-react"
import { bibliotecaActivities } from "@/lib/data/biblioteca"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function BibliotecaPage() {
    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Biblioteca Nitiv</h1>
                    <p className="text-slate-500 mt-1">
                        Actividades, guías y plantillas predefinidas para el aula.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bibliotecaActivities.map((activity) => (
                        <Card key={activity.id} className="flex flex-col h-full bg-white shadow-sm hover:shadow transition-shadow overflow-hidden border-slate-200">
                            {/* Top decorative color bar */}
                            <div className={`h-2 w-full ${activity.color}`} />

                            <CardHeader className="pb-4">
                                <div className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wider">
                                    {activity.eje}
                                </div>
                                <CardTitle className="text-xl leading-tight text-slate-900">
                                    {activity.title}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Target className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-600 line-clamp-3">
                                            {activity.objective}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                        <p className="text-sm text-slate-600 font-medium">
                                            {activity.durationInfo}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-0 pb-5">
                                <Link
                                    href={`/biblioteca/${activity.id}`}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-50 text-indigo-700 font-medium border border-slate-200 hover:bg-slate-100 hover:text-indigo-800 transition-colors"
                                >
                                    Ver Actividad
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
    )
}
