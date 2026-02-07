import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminBottomNav from '@/components/AdminBottomNav'
import { TrendingUp } from 'lucide-react'

export default async function StatisticsPage() {
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

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Estadísticas</h1>
                    <p className="text-gray-600">Visualiza métricas y análisis institucionales</p>
                </div>

                {/* Coming Soon */}
                <div className="bg-white rounded-2xl p-12 shadow-md border-2 border-gray-100 text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-6">
                        <TrendingUp className="text-white" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-[#475569] mb-4">Próximamente</h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                        Las estadísticas detalladas estarán disponibles pronto. Podrás visualizar gráficos y métricas sobre el rendimiento institucional.
                    </p>
                </div>
            </div>

            <AdminBottomNav />
        </div>
    )
}
