import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminBottomNav from '@/components/AdminBottomNav'
import { AlertTriangle } from 'lucide-react'

export default async function AlertsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        redirect('/dashboard')
    }

    // Get all students in institution
    const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .eq('institution_id', profile.institution_id)
        .eq('role', 'student')

    const studentIds = students?.map(s => s.id) || []

    // Get alerts for these students
    const { data: alerts } = await supabase
        .from('alerts')
        .select(`
            *,
            student:profiles!student_id(full_name)
        `)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })

    const activeAlerts = alerts?.filter(a => !a.is_read) || []
    const resolvedAlerts = alerts?.filter(a => a.is_read) || []

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Alertas del Sistema</h1>
                    <p className="text-gray-600">Monitorea alertas de estudiantes</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                                <AlertTriangle className="text-white" size={24} />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Alertas Activas</p>
                                <p className="text-3xl font-bold text-[#475569]">{activeAlerts.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                                <AlertTriangle className="text-white" size={24} />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Alertas Resueltas</p>
                                <p className="text-3xl font-bold text-[#475569]">{resolvedAlerts.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts List */}
                <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
                    <div className="p-6 border-b-2 border-gray-200">
                        <h2 className="text-xl font-bold text-[#475569]">Alertas Recientes</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {alerts && alerts.length > 0 ? (
                            alerts.slice(0, 10).map((alert) => (
                                <div key={alert.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${!alert.is_read
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {!alert.is_read ? 'No Leída' : 'Leída'}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                        alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Media' : 'Baja'}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-gray-900 mb-1">
                                                {alert.student?.full_name || 'Estudiante desconocido'}
                                            </h3>
                                            <p className="text-gray-600 text-sm">{alert.message}</p>
                                            <p className="text-gray-400 text-xs mt-2">
                                                {new Date(alert.created_at).toLocaleString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-gray-500">
                                No hay alertas registradas
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AdminBottomNav />
        </div>
    )
}
