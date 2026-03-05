import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BookOpen, AlertCircle, LifeBuoy, Phone } from "lucide-react"
import { studentLibraryData } from "@/data/student-library"
import { StudentPdfDownload } from "@/components/biblioteca/student-pdf-download"

export default async function EstudianteBibliotecaItemPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const item = studentLibraryData.find(i => i.id === id)

    if (!item) {
        notFound()
    }

    return (
        <main className="min-h-screen bg-slate-50 py-8">
            <div className="mx-auto max-w-4xl px-4 space-y-6">

                {/* Header actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link
                        href="/estudiante/biblioteca"
                        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a la Biblioteca
                    </Link>

                    <StudentPdfDownload item={item} />
                </div>

                {/* Article Content */}
                <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="h-3 w-full bg-indigo-500" />

                    <div className="p-6 sm:p-10 space-y-8">

                        {/* Title & Category */}
                        <header className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm uppercase tracking-wider">
                                <BookOpen className="w-4 h-4" />
                                {item.category}
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                                {item.title}
                            </h1>
                        </header>

                        {/* Intro */}
                        <div className="text-lg text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-lg border border-slate-100">
                            {item.content.intro}
                        </div>

                        {/* Sections */}
                        <div className="space-y-10">
                            {item.content.sections.map((section, idx) => (
                                <section key={idx} className="space-y-4">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm">
                                            {idx + 1}
                                        </span>
                                        {section.title}
                                    </h2>
                                    <ul className="space-y-3 mt-4 ml-4 sm:ml-11">
                                        {section.items.map((listItem: string, itemIdx: number) => (
                                            <li key={itemIdx} className="flex gap-3 text-slate-600 leading-relaxed">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2.5" />
                                                <span>{listItem}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>

                        {/* Warning */}
                        {item.content.warning && (
                            <div className="mt-12 bg-amber-50 border border-amber-200 rounded-lg p-6 flex gap-4 items-start">
                                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-amber-800 font-medium leading-relaxed">
                                    {item.content.warning.replace('⚠️ ', '')}
                                </p>
                            </div>
                        )}

                    </div>
                </article>

            </div>
        </main>
    )
}
