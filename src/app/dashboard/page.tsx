import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch profile to determine role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile) {
        // If no profile found (sync issue), fallback or show error
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Perfil No Encontrado</h2>
                    <p className="text-gray-500 mb-6">Tu cuenta fue creada pero aún no tienes un perfil asignado en el sistema.</p>

                    <form action={async () => {
                        'use server'
                        const { createClient } = await import('@/lib/supabase/server')
                        const { redirect } = await import('next/navigation')
                        const supabase = await createClient()
                        await supabase.auth.signOut()
                        redirect('/login')
                    }}>
                        <button className="bg-gray-800 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors w-full">
                            Cerrar Sesión e Intentar Nuevamente
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    // Redirect to specific dashboard based on role
    switch (profile.role) {
        case 'student':
            redirect('/dashboard/student')
        case 'teacher':
            redirect('/dashboard/teacher')
        case 'professional':
            redirect('/dashboard/professional')
        case 'admin':
            redirect('/dashboard/admin')
        case 'superadmin':
            redirect('/dashboard/admin')
        default:
            return <div className="p-8">Rol desconocido: {profile.role}</div>
    }
}
