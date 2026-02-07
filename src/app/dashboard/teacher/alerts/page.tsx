import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import TeacherBottomNav from '@/components/TeacherBottomNav'
import Link from 'next/link'
import { markAlertRead } from './actions'

export default async function AlertsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch all alerts for students in teacher's courses
    const { data: alerts } = await supabase
        .from('alerts')
        .select(`
            id,
            type,
            priority,
            message,
            is_read,
            created_at,
            student:profiles!alerts_student_id_fkey(
                id,
                full_name
            )
        `)
        .order('created_at', { ascending: false })

    const unreadAlerts = alerts?.filter(a => !a.is_read) || []
    const readAlerts = alerts?.filter(a => a.is_read) || []

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
                    <AlertTriangle className="text-orange-500" />
                    Alertas
                </h1>
                <p className="text-[#64748B]">Gestiona las alertas de tus estudiantes</p>
            </header>

            <main className="px-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">Sin leer</p>
                        <p className="text-3xl font-bold text-orange-600">{unreadAlerts.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">Total</p>
                        <p className="text-3xl font-bold text-[#475569]">{alerts?.length || 0}</p>
                    </div>
                </div>

                {/* Unread Alerts */}
                {unreadAlerts.length > 0 && (
                    <section>
                        <h2 className="font-bold text-[#475569] mb-3 text-lg">Pendientes de revisar</h2>
                        <div className="space-y-3">
                            {unreadAlerts.map((alert) => (
                                <div key={alert.id} className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-orange-400">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`
                                                    text-[10px] uppercase font-bold px-2 py-1 rounded
                                                    ${alert.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                        alert.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                                                            'bg-yellow-100 text-yellow-600'}
                                                `}>
                                                    {alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Media' : 'Baja'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(alert.created_at).toLocaleDateString('es-ES', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-[#475569]">
                                                {Array.isArray((alert as any).student) ? (alert as any).student[0]?.full_name : (alert as any).student?.full_name || 'Estudiante'}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">{alert.message || 'Alerta detectada'}</p>
                                        </div>
                                        <form action={markAlertRead}>
                                            <input type="hidden" name="alertId" value={alert.id} />
                                            <button
                                                type="submit"
                                                className="text-sm text-blue-600 hover:underline font-medium px-3 py-1 rounded-lg hover:bg-blue-50 whitespace-nowrap"
                                            >
                                                Marcar leída
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Read Alerts */}
                {readAlerts.length > 0 && (
                    <section>
                        <h2 className="font-bold text-gray-400 mb-3 text-lg">Revisadas</h2>
                        <div className="space-y-3">
                            {readAlerts.map((alert) => (
                                <div key={alert.id} className="bg-gray-50 p-5 rounded-xl border border-gray-200 opacity-60">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-gray-200 text-gray-600">
                                            {alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Media' : 'Baja'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(alert.created_at).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-700">
                                        {Array.isArray((alert as any).student) ? (alert as any).student[0]?.full_name : (alert as any).student?.full_name || 'Estudiante'}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{alert.message || 'Alerta detectada'}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {(!alerts || alerts.length === 0) && (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium text-gray-500">No hay alertas registradas</p>
                        <p className="text-sm text-gray-400 mt-1">Las alertas aparecerán aquí cuando sean generadas</p>
                    </div>
                )}
            </main>
        </div>
    )
}
