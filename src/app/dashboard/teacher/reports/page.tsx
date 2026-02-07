import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, ArrowLeft } from 'lucide-react'
import TeacherBottomNav from '@/components/TeacherBottomNav'
import Link from 'next/link'

export default async function ReportsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch reports for students in teacher's courses (read-only)
    const { data: reports } = await supabase
        .from('reports')
        .select(`
            id,
            title,
            summary,
            content,
            priority,
            created_at,
            student:profiles!reports_student_id_fkey(
                id,
                full_name
            ),
            professional:profiles!reports_professional_id_fkey(
                full_name
            ),
            course:courses(
                name
            )
        `)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-32 pb-24 md:pb-6">
            <TeacherBottomNav />

            {/* Header */}
            <header className="p-6 bg-gradient-to-br from-white to-[#F8F9FA] shadow-sm mb-6 border-b-2 border-gray-200">
                <Link href="/dashboard/teacher" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3">
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>
                <h1 className="text-2xl font-bold text-[#475569] flex items-center gap-2">
                    <BookOpen className="text-pink-500" />
                    Reportes Psicológicos
                </h1>
                <p className="text-[#64748B]">Vista de reportes creados por profesionales (solo lectura)</p>
            </header>

            <main className="px-6 space-y-6">
                {/* Info Banner */}
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
                    <p className="text-sm text-pink-800">
                        <span className="font-bold">Nota:</span> Estos reportes son creados por psicólogos y solo puedes visualizarlos.
                        Contacta al profesional para más información.
                    </p>
                </div>

                {/* Reports List */}
                <section>
                    <h2 className="font-bold text-[#475569] mb-3 text-lg">
                        Reportes Disponibles ({reports?.length || 0})
                    </h2>
                    <div className="space-y-3">
                        {reports && reports.length > 0 ? (
                            reports.map((report) => (
                                <div key={report.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`
                                            text-[10px] uppercase font-bold px-2 py-1 rounded
                                            ${report.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                report.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-yellow-100 text-yellow-600'}
                                        `}>
                                            Prioridad {report.priority === 'high' ? 'Alta' :
                                                report.priority === 'medium' ? 'Media' : 'Baja'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(report.created_at).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-[#475569] text-lg">{report.title}</h3>

                                    <div className="flex gap-4 text-sm text-gray-600 mt-2">
                                        <p>
                                            <span className="font-medium">Estudiante:</span> {report.student?.full_name || 'N/A'}
                                        </p>
                                        {report.course && (
                                            <p>
                                                <span className="font-medium">Curso:</span> {report.course.name}
                                            </p>
                                        )}
                                    </div>

                                    {report.summary && (
                                        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm font-medium text-gray-700 mb-1">Resumen:</p>
                                            <p className="text-sm text-gray-600">{report.summary}</p>
                                        </div>
                                    )}

                                    {report.content && (
                                        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm font-medium text-gray-700 mb-1">Contenido:</p>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.content}</p>
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-500 mt-4">
                                        Creado por: <span className="font-medium">{report.professional?.full_name || 'Profesional'}</span>
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl p-12 text-center">
                                <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="font-medium text-gray-500">No hay reportes disponibles</p>
                                <p className="text-sm text-gray-400 mt-1">Los reportes psicológicos aparecerán aquí cuando sean creados</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
