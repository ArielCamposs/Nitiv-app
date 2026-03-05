import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { studentLibraryData } from "@/data/student-library"

export default function EstudianteBibliotecaPage() {
    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Biblioteca Nitiv</h1>
                    <p className="text-slate-500 mt-1">
                        Artículos y guías de educación emocional pensados para ti.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {studentLibraryData.map((item) => (
                        <Card key={item.id} className="flex flex-col h-full bg-white shadow-sm hover:shadow transition-shadow overflow-hidden border-slate-200">
                            {/* Top decorative color bar */}
                            <div className="h-2 w-full bg-indigo-500" />

                            <CardHeader className="pb-4">
                                <div className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wider">
                                    {item.category}
                                </div>
                                <CardTitle className="text-xl leading-tight text-slate-900">
                                    {item.title}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-4">
                                <div className="flex gap-2">
                                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-slate-600 line-clamp-3">
                                        {item.description}
                                    </p>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-0 pb-5">
                                <Link
                                    href={`/estudiante/biblioteca/${item.id}`}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-50 text-indigo-700 font-medium border border-slate-200 hover:bg-slate-100 hover:text-indigo-800 transition-colors"
                                >
                                    Leer Artículo
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
