import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentBottomNav from '@/components/StudentBottomNav'

export default async function StudentBitacora() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-28">
            <StudentBottomNav />

            <div className="p-6">
                <h1 className="text-3xl font-bold text-[#475569] mb-2">📊 Mi Progreso</h1>
                <p className="text-[#64748B] mb-6">Revisa tu evolución y tendencias</p>

                <div className="bg-white rounded-2xl p-8 shadow-md text-center border border-gray-100">
                    <div className="text-6xl mb-4">📈</div>
                    <h3 className="text-xl font-bold text-[#475569] mb-2">Próximamente</h3>
                    <p className="text-[#64748B]">Aquí podrás ver tus estadísticas completas, gráficos de progreso y logros desbloqueados.</p>
                </div>
            </div>
        </div>
    )
}
