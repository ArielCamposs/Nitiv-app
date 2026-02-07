import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentBottomNav from '@/components/StudentBottomNav'
import { ShoppingBag, Coins, Gift } from 'lucide-react'

export default async function StudentShop() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-28">
            <StudentBottomNav />

            <div className="p-6">
                <h1 className="text-3xl font-bold text-[#475569] mb-2">🛒 Tienda de Recompensas</h1>
                <p className="text-[#64748B] mb-6">Canjea tus puntos por premios increíbles</p>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 mb-6 border-2 border-orange-200">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center">
                            <Coins className="text-white" size={32} />
                        </div>
                        <div>
                            <p className="text-sm text-orange-600 font-semibold">Tus Puntos</p>
                            <p className="text-3xl font-bold text-orange-700">0 <span className="text-lg">pts</span></p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-md text-center border border-gray-100">
                    <div className="text-6xl mb-4">🎁</div>
                    <h3 className="text-xl font-bold text-[#475569] mb-2">Próximamente</h3>
                    <p className="text-[#64748B] mb-4">Aquí podrás canjear tus puntos ganados por premios especiales, avatares, y más.</p>
                    <div className="flex gap-4 justify-center mt-6">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <Gift className="text-gray-400 mx-auto mb-2" size={32} />
                            <p className="text-xs text-gray-500">Avatares</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <ShoppingBag className="text-gray-400 mx-auto mb-2" size={32} />
                            <p className="text-xs text-gray-500">Premios</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
