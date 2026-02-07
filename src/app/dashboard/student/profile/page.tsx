import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentBottomNav from '@/components/StudentBottomNav'
import { Mail, Calendar, Award } from 'lucide-react'

export default async function StudentProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, email, created_at')
        .eq('id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-28">
            <StudentBottomNav />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-[#475569]">👤 Mi Perfil</h1>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#475569]">{profile?.full_name || 'Usuario'}</h2>
                            <p className="text-[#64748B] capitalize">{profile?.role || 'Estudiante'}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Mail className="text-[#64748B]" size={20} />
                            <div>
                                <p className="text-xs text-[#94A3B8]">Email</p>
                                <p className="text-sm font-semibold text-[#475569]">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Calendar className="text-[#64748B]" size={20} />
                            <div>
                                <p className="text-xs text-[#94A3B8]">Miembro desde</p>
                                <p className="text-sm font-semibold text-[#475569]">
                                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-ES') : 'N/A'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200">
                            <Award className="text-purple-600" size={20} />
                            <div>
                                <p className="text-xs text-purple-600 font-semibold">Puntos Totales</p>
                                <p className="text-lg font-bold text-purple-700">0 pts</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coming Soon */}
                <div className="bg-white rounded-2xl p-6 shadow-md text-center border border-gray-100">
                    <div className="text-4xl mb-3">⚙️</div>
                    <h3 className="text-lg font-bold text-[#475569] mb-2">Configuración</h3>
                    <p className="text-sm text-[#64748B]">Pronto podrás editar tu perfil, cambiar tu avatar y personalizar tu experiencia.</p>
                </div>
            </div>
        </div>
    )
}
