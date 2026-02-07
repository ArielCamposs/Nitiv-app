import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, GraduationCap, UserCheck, AlertTriangle, FileText, Calendar, TrendingUp } from 'lucide-react'
import AdminBottomNav from '@/components/AdminBottomNav'
import Link from 'next/link'

export default async function AdminDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user profile and verify admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        redirect('/dashboard')
    }

    // Get statistics
    const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('institution_id', profile.institution_id)

    const students = allUsers?.filter(u => u.role === 'student') || []
    const teachers = allUsers?.filter(u => u.role === 'teacher') || []
    const professionals = allUsers?.filter(u => u.role === 'professional') || []

    const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .in('student_id', students.map(s => s.id))

    const { count: activitiesCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile.institution_id)

    const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile.institution_id)

    const stats = [
        {
            title: 'Total Estudiantes',
            value: students.length,
            icon: GraduationCap,
            color: 'from-blue-400 to-blue-600',
            href: '/dashboard/admin/users?tab=students'
        },
        {
            title: 'Profesores',
            value: teachers.length,
            icon: Users,
            color: 'from-green-400 to-green-600',
            href: '/dashboard/admin/users?tab=teachers'
        },
        {
            title: 'Psicólogos',
            value: professionals.length,
            icon: UserCheck,
            color: 'from-purple-400 to-purple-600',
            href: '/dashboard/admin/users?tab=professionals'
        },
        {
            title: 'Alertas Activas',
            value: alertsCount || 0,
            icon: AlertTriangle,
            color: 'from-orange-400 to-orange-600',
            href: '/dashboard/admin/alerts'
        },
        {
            title: 'Cursos',
            value: coursesCount || 0,
            icon: FileText,
            color: 'from-teal-400 to-teal-600',
            href: '/dashboard/admin/courses'
        },
        {
            title: 'Actividades',
            value: activitiesCount || 0,
            icon: Calendar,
            color: 'from-pink-400 to-pink-600',
            href: '/dashboard/admin/activities'
        },
    ]

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Panel de Administración</h1>
                    <p className="text-gray-600">Gestiona usuarios, cursos y supervisa toda la actividad institucional</p>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {stats.map((stat) => {
                        const Icon = stat.icon
                        return (
                            <Link
                                key={stat.title}
                                href={stat.href}
                                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-200 border-2 border-gray-100 hover:scale-105"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                        <Icon className="text-white" size={24} />
                                    </div>
                                    <TrendingUp className="text-gray-400" size={20} />
                                </div>
                                <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
                                <p className="text-3xl font-bold text-[#475569]">{stat.value}</p>
                            </Link>
                        )
                    })}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
                    <h2 className="text-xl font-bold text-[#475569] mb-4">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href="/dashboard/admin/users?action=create"
                            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200"
                        >
                            <Users className="text-blue-600" size={24} />
                            <span className="font-semibold text-blue-900">Crear Usuario</span>
                        </Link>
                        <Link
                            href="/dashboard/admin/courses?action=create"
                            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all duration-200"
                        >
                            <FileText className="text-green-600" size={24} />
                            <span className="font-semibold text-green-900">Crear Curso</span>
                        </Link>
                        <Link
                            href="/dashboard/admin/alerts"
                            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-all duration-200"
                        >
                            <AlertTriangle className="text-orange-600" size={24} />
                            <span className="font-semibold text-orange-900">Ver Alertas</span>
                        </Link>
                        <Link
                            href="/dashboard/admin/statistics"
                            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all duration-200"
                        >
                            <TrendingUp className="text-purple-600" size={24} />
                            <span className="font-semibold text-purple-900">Estadísticas</span>
                        </Link>
                    </div>
                </div>
            </div>

            <AdminBottomNav />
        </div>
    )
}
