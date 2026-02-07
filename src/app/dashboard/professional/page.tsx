import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardList, Calendar, FileText, TrendingUp, Clock } from 'lucide-react'
import StatsCard from './components/StatsCard'
import CaseRow from './components/CaseRow'
import ProfessionalBottomNav from '@/components/ProfessionalBottomNav'
import DashboardClientWrapper from './components/DashboardClientWrapper'

export default async function ProfessionalDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, institution_id')
        .eq('id', user.id)
        .single()

    // Fetch students from same institution for modals
    const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('institution_id', profile?.institution_id)
        .eq('role', 'student')
        .order('full_name')

    // Fetch Cases
    const { data: cases } = await supabase
        .from('cases')
        .select('*, student:profiles!cases_student_id_fkey(full_name)')
        .eq('professional_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10)

    const activeCases = cases?.length || 0

    // Fetch this week's appointments
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    const { data: weekAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('professional_id', user.id)
        .gte('appointment_date', startOfWeek.toISOString())
        .lt('appointment_date', endOfWeek.toISOString())
        .in('status', ['scheduled', 'completed'])

    const weekSessionsCount = weekAppointments?.length || 0

    // Fetch pending reports
    const { data: pendingReports } = await supabase
        .from('reports')
        .select('id')
        .eq('professional_id', user.id)
        .is('content', null) // Assume null content means pending

    const pendingReportsCount = pendingReports?.length || 0

    // Fetch today's appointments
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('*, student:profiles!appointments_student_id_fkey(full_name)')
        .eq('professional_id', user.id)
        .gte('appointment_date', startOfDay.toISOString())
        .lt('appointment_date', endOfDay.toISOString())
        .order('appointment_date', { ascending: true })
        .limit(5)

    // Format case data for component
    const formattedCases = cases?.map(c => ({
        id: c.id,
        student_name: c.student?.full_name || 'Sin nombre',
        student_id: c.student_id,
        summary: c.summary,
        status: c.status,
        priority: 'medium' as const,
        last_session: 'Hace 3 días'
    })) || []

    const currentDate = new Date().toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <ProfessionalBottomNav />
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-[#475569] mb-2">Escritorio Clínico</h1>
                            <p className="text-gray-500 capitalize">{currentDate}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <DashboardClientWrapper students={students || []} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatsCard
                        title="Casos Activos"
                        value={activeCases}
                        icon={ClipboardList}
                        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                        iconColor="bg-white/20"
                    />
                    <StatsCard
                        title="Sesiones Esta Semana"
                        value={weekSessionsCount}
                        icon={Calendar}
                        gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                        iconColor="bg-white/20"
                    />
                    <StatsCard
                        title="Reportes Pendientes"
                        value={pendingReportsCount}
                        icon={FileText}
                        gradient="bg-gradient-to-br from-orange-500 to-orange-600"
                        iconColor="bg-white/20"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar: Agenda */}
                    <aside className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
                            <h2 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                                <Clock className="text-[#A855F7]" size={20} />
                                Agenda Hoy
                            </h2>

                            <div className="space-y-4">
                                {todayAppointments && todayAppointments.length > 0 ? (
                                    todayAppointments.map((apt, index) => {
                                        const aptDate = new Date(apt.appointment_date)
                                        const timeStr = aptDate.toLocaleTimeString('es-CL', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        })
                                        const isCurrent = index === 0
                                        const isPast = index < 0 // For future implementation
                                        const borderColor = apt.status === 'completed' ? 'border-gray-200' :
                                            isCurrent ? 'border-[#A855F7]' : 'border-blue-300'
                                        const dotColor = apt.status === 'completed' ? 'bg-gray-300' :
                                            isCurrent ? 'bg-[#A855F7]' : 'bg-blue-400'
                                        const opacity = apt.status === 'completed' ? 'opacity-50' : ''

                                        return (
                                            <div key={apt.id} className={`relative pl-4 border-l-2 ${borderColor} py-2 ${opacity}`}>
                                                <div className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full ${dotColor} border-2 border-white`} />
                                                <span className="text-xs font-bold text-gray-500 block mb-1">{timeStr}</span>
                                                <h4 className="font-bold text-sm text-[#475569]">
                                                    {apt.student?.full_name || 'Sin asignar'}
                                                </h4>
                                                <p className="text-xs text-gray-400">{apt.title}</p>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <Clock size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No hay sesiones programadas hoy</p>
                                    </div>
                                )}
                            </div>

                            <button className="w-full mt-6 py-2 text-sm text-[#475569] hover:bg-gray-50 rounded-lg font-medium transition-colors">
                                Ver Agenda Completa
                            </button>
                        </div>
                    </aside>

                    {/* Main: Cases Table */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                    <TrendingUp className="text-blue-500" size={20} />
                                    Casos Activos
                                </h2>
                                <span className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full font-medium">
                                    {activeCases} casos
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Estudiante
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Prioridad
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Resumen
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Última Sesión
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {formattedCases.length > 0 ? (
                                            formattedCases.map(caseData => (
                                                <CaseRow key={caseData.id} caseData={caseData} />
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-16 text-center">
                                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                                        <ClipboardList size={48} className="mb-4 opacity-50" />
                                                        <p className="font-medium">No hay casos activos</p>
                                                        <p className="text-sm mt-1">Crea un nuevo caso para comenzar</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

