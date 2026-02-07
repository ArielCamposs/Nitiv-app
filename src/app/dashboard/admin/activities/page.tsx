import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminBottomNav from '@/components/AdminBottomNav'
import { Calendar } from 'lucide-react'

export default async function ActivitiesPage() {
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

    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('institution_id', profile.institution_id)
        .order('created_at', { ascending: false })
        .limit(20)

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Actividades</h1>
                    <p className="text-gray-600">Visualiza todas las actividades institucionales</p>
                </div>

                {/* Activities List */}
                <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
                    <div className="p-6 border-b-2 border-gray-200">
                        <h2 className="text-xl font-bold text-[#475569]">Actividades Recientes</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {activities && activities.length > 0 ? (
                            activities.map((activity) => (
                                <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="text-white" size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">{activity.title}</h3>
                                            <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>{new Date(activity.created_at).toLocaleDateString('es-ES')}</span>
                                                <span className="px-2 py-1 bg-gray-100 rounded">
                                                    {activity.activity_type || 'General'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-gray-500">
                                No hay actividades registradas
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AdminBottomNav />
        </div>
    )
}
