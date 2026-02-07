import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Search, AlertCircle } from 'lucide-react'
import ProfessionalBottomNav from '@/components/ProfessionalBottomNav'
import ReportsClientWrapper from '../components/ReportsClientWrapper'

export default async function ReportsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch profile to get institution
    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    // Fetch students from same institution
    const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('institution_id', profile?.institution_id)
        .eq('role', 'student')
        .order('full_name')

    // Fetch all reports
    const { data: reports } = await supabase
        .from('reports')
        .select(`
            *,
            student:profiles!reports_student_id_fkey(id, full_name),
            course:courses(name)
        `)
        .eq('professional_id', user.id)
        .order('created_at', { ascending: false })

    const allReports = reports || []
    const pendingReports = allReports.filter(r => !r.content || r.content.trim() === '')
    const completedReports = allReports.filter(r => r.content && r.content.trim() !== '')

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <ProfessionalBottomNav />

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-[#475569] mb-2">Reportes Clínicos</h1>
                            <p className="text-gray-500">Informes y evaluaciones de estudiantes</p>
                        </div>
                        <ReportsClientWrapper students={students || []} />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Total de Reportes</p>
                        <p className="text-3xl font-bold text-[#475569]">{allReports.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Pendientes</p>
                        <p className="text-3xl font-bold text-orange-600">{pendingReports.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Completados</p>
                        <p className="text-3xl font-bold text-green-600">{completedReports.length}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar reportes..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>

                {/* Reports List */}
                <div className="space-y-4">
                    {allReports.length > 0 ? (
                        allReports.map((report) => {
                            const isPending = !report.content || report.content.trim() === ''
                            const createdDate = new Date(report.created_at).toLocaleDateString('es-CL', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })

                            const priorityColors = {
                                low: 'bg-blue-100 text-blue-700',
                                medium: 'bg-yellow-100 text-yellow-700',
                                high: 'bg-red-100 text-red-700'
                            }

                            const student = Array.isArray(report.student) ? report.student[0] : report.student
                            const course = Array.isArray(report.course) ? report.course[0] : report.course

                            return (
                                <div key={report.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-[#475569]">{report.title}</h3>
                                                {isPending && (
                                                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                                        <AlertCircle size={14} />
                                                        Pendiente
                                                    </span>
                                                )}
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityColors[report.priority as keyof typeof priorityColors] || priorityColors.low}`}>
                                                    {report.priority === 'high' ? 'Alta' : report.priority === 'medium' ? 'Media' : 'Baja'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>Estudiante: <span className="font-semibold text-[#475569]">{student?.full_name || 'Sin asignar'}</span></span>
                                                {course && (
                                                    <span>Curso: <span className="font-semibold">{course.name}</span></span>
                                                )}
                                                <span>{createdDate}</span>
                                            </div>

                                            {report.summary && (
                                                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{report.summary}</p>
                                            )}
                                        </div>

                                        <button className="ml-4 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
                                            {isPending ? 'Completar' : 'Ver Detalles'}
                                        </button>
                                    </div>

                                    {report.content && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-600 line-clamp-3">{report.content}</p>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    ) : (
                        <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 text-center">
                            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="font-medium text-gray-400">No hay reportes registrados</p>
                            <p className="text-sm text-gray-400 mt-1">Crea un nuevo reporte para comenzar</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

