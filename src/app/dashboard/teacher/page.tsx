import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle, BookOpen, Calendar, Users } from 'lucide-react'
import LogoutWrapper from '@/components/LogoutWrapper'
import TeacherBottomNav from '@/components/TeacherBottomNav'
import Link from 'next/link'

export default async function TeacherDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

    // Fetch Teacher's Courses
    const { data: teacherCourses } = await supabase
        .from('teacher_courses')
        .select(`
            id,
            course:courses(
                id,
                name,
                grade
            )
        `)
        .eq('teacher_id', user.id)

    const courses = teacherCourses?.map(tc => Array.isArray(tc.course) ? tc.course[0] : tc.course).filter(Boolean) || []

    // Get course IDs for filtering
    const courseIds = courses.map(c => c?.id).filter(Boolean) as string[]

    // Fetch Unread Alerts for students in teacher's courses
    const { data: alerts } = await supabase
        .from('alerts')
        .select(`
            id,
            type,
            priority,
            message,
            created_at,
            student:profiles!alerts_student_id_fkey(
                id,
                full_name
            )
        `)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5)

    // Fetch upcoming activities
    const today = new Date().toISOString().split('T')[0]
    const { data: upcomingActivities } = await supabase
        .from('school_activities')
        .select('id, title, activity_date, activity_type, course:courses(name)')
        .eq('teacher_id', user.id)
        .gte('activity_date', today)
        .order('activity_date', { ascending: true })
        .limit(3)

    // Stats
    const totalAlerts = alerts?.length || 0

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-32 pb-24 md:pb-6">
            <TeacherBottomNav />

            {/* Header */}
            <header className="p-6 bg-gradient-to-br from-white to-[#F8F9FA] shadow-sm rounded-b-3xl mb-6 border-b-2 border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#475569]">
                            Bienvenido, {profile?.full_name || 'Profesor'} 👋
                        </h1>
                        <p className="text-[#64748B]">Panel General - Resumen de tu trabajo docente</p>
                    </div>

                </div>
            </header>

            <main className="px-6 space-y-6">
                {/* Quick Stats */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                <BookOpen className="text-white" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#475569]">{courses.length}</p>
                                <p className="text-xs text-[#64748B]">Cursos</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                                <AlertTriangle className="text-white" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#475569]">{totalAlerts}</p>
                                <p className="text-xs text-[#64748B]">Alertas</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                                <Calendar className="text-white" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#475569]">{upcomingActivities?.length || 0}</p>
                                <p className="text-xs text-[#64748B]">Próximas</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                <Users className="text-white" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#475569]">--</p>
                                <p className="text-xs text-[#64748B]">Estudiantes</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Alerts Section */}
                <section className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-[#475569] flex items-center gap-2">
                            <AlertTriangle className="text-orange-500" size={20} />
                            Alertas Recientes
                        </h2>
                        <Link
                            href="/dashboard/teacher/alerts"
                            className="text-sm text-blue-600 hover:underline font-medium"
                        >
                            Ver todas
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {alerts && alerts.length > 0 ? (
                            alerts.map((alert) => (
                                <div key={alert.id} className="bg-gray-50 p-4 rounded-xl border-l-4 border-orange-400">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`
                                            text-[10px] uppercase font-bold px-2 py-1 rounded
                                            ${alert.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                alert.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-yellow-100 text-yellow-600'}
                                        `}>
                                            {alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Media' : 'Baja'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(alert.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[#475569] text-sm">
                                        {Array.isArray((alert as any).student) ? (alert as any).student[0]?.full_name : (alert as any).student?.full_name || 'Estudiante'}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">{alert.message || 'Alerta detectada'}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No hay alertas pendientes</p>
                                <p className="text-sm mt-1">¡Excelente trabajo!</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* My Courses */}
                <section className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-[#475569] flex items-center gap-2">
                            <BookOpen className="text-blue-500" size={20} />
                            Mis Cursos
                        </h2>
                        <Link
                            href="/dashboard/teacher/students"
                            className="text-sm text-blue-600 hover:underline font-medium"
                        >
                            Ver estudiantes
                        </Link>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {courses.length > 0 ? (
                            courses.map((course: any) => (
                                <div
                                    key={course.id}
                                    className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-blue-100"
                                >
                                    <h3 className="font-bold text-[#475569] mb-1">{course.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Users size={14} />
                                        <span>{course.grade || 'General'}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 text-center py-8 text-gray-400">
                                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No tienes cursos asignados</p>
                                <p className="text-sm mt-1">Contacta al administrador</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Upcoming Activities */}
                <section className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-[#475569] flex items-center gap-2">
                            <Calendar className="text-green-500" size={20} />
                            Próximas Actividades
                        </h2>
                        <Link
                            href="/dashboard/teacher/activities"
                            className="text-sm text-blue-600 hover:underline font-medium"
                        >
                            Ver todas
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {upcomingActivities && upcomingActivities.length > 0 ? (
                            upcomingActivities.map((activity) => (
                                <div key={activity.id} className="bg-gray-50 p-4 rounded-xl">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-[#475569] text-sm">{activity.title}</h3>
                                        <span className="text-xs text-gray-500">
                                            {new Date(activity.activity_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600">{Array.isArray((activity as any).course) ? (activity as any).course[0]?.name : (activity as any).course?.name || 'Curso'}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No hay actividades próximas</p>
                                <p className="text-sm mt-1">Crea una nueva actividad</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
