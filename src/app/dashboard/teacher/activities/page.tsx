import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, ArrowLeft } from 'lucide-react'
import TeacherBottomNav from '@/components/TeacherBottomNav'
import Link from 'next/link'
import { deleteActivity } from './actions'
import CreateActivityModal from './CreateActivityModal'

export default async function ActivitiesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch teacher's courses
    const { data: teacherCourses } = await supabase
        .from('teacher_courses')
        .select('course:courses(id, name, grade)')
        .eq('teacher_id', user.id)

    const courses = teacherCourses?.map(tc => Array.isArray(tc.course) ? tc.course[0] : tc.course).filter(Boolean) || []

    // Fetch activities
    const { data: activities } = await supabase
        .from('school_activities')
        .select(`
            id,
            title,
            description,
            activity_date,
            activity_type,
            created_at,
            course:courses(name)
        `)
        .eq('teacher_id', user.id)
        .order('activity_date', { ascending: true })

    const today = new Date().toISOString().split('T')[0]
    const upcoming = activities?.filter(a => a.activity_date >= today) || []
    const past = activities?.filter(a => a.activity_date < today) || []

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
                    <Calendar className="text-green-500" />
                    Actividades Escolares
                </h1>
                <p className="text-[#64748B]">Planifica y registra actividades para tus cursos</p>
            </header>

            <main className="px-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">Próximas</p>
                        <p className="text-3xl font-bold text-green-600">{upcoming.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">Total</p>
                        <p className="text-3xl font-bold text-gray-700">{activities?.length || 0}</p>
                    </div>
                </div>

                {/* Upcoming Activities */}
                {upcoming.length > 0 && (
                    <section>
                        <h2 className="font-bold text-[#475569] mb-3 text-lg">Próximas Actividades ({upcoming.length})</h2>
                        <div className="space-y-3">
                            {upcoming.map((activity) => (
                                <div key={activity.id} className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-400">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-green-100 text-green-600">
                                                {activity.activity_type === 'assignment' ? 'Tarea' :
                                                    activity.activity_type === 'exam' ? 'Examen' :
                                                        activity.activity_type === 'event' ? 'Evento' :
                                                            activity.activity_type === 'project' ? 'Proyecto' : 'Otro'}
                                            </span>
                                            <h3 className="font-bold text-[#475569] mt-2">{activity.title}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{Array.isArray((activity as any).course) ? (activity as any).course[0]?.name : (activity as any).course?.name}</p>
                                            {activity.description && <p className="text-sm text-gray-500 mt-2">{activity.description}</p>}
                                            <p className="text-xs text-gray-400 mt-2">
                                                {new Date(activity.activity_date).toLocaleDateString('es-ES', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long'
                                                })}
                                            </p>
                                        </div>
                                        <form action={deleteActivity}>
                                            <input type="hidden" name="activityId" value={activity.id} />
                                            <button
                                                type="submit"
                                                className="text-xs text-red-600 hover:underline ml-4"
                                            >
                                                Eliminar
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Past Activities */}
                {past.length > 0 && (
                    <section>
                        <h2 className="font-bold text-gray-400 mb-3 text-lg">Actividades Pasadas</h2>
                        <div className="space-y-3">
                            {past.slice(0, 5).map((activity) => (
                                <div key={activity.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 opacity-60">
                                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-gray-200 text-gray-600">
                                        {activity.activity_type === 'assignment' ? 'Tarea' :
                                            activity.activity_type === 'exam' ? 'Examen' :
                                                activity.activity_type === 'event' ? 'Evento' :
                                                    activity.activity_type === 'project' ? 'Proyecto' : 'Otro'}
                                    </span>
                                    <h3 className="font-bold text-gray-700 mt-2">{activity.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(activity.activity_date).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {activities?.length === 0 && (
                    <div className="bg-white rounded-2xl p-12 text-center">
                        <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium text-gray-500">No hay actividades registradas</p>
                        <p className="text-sm text-gray-400 mt-1">Haz click en el botón + para crear tu primera actividad</p>
                    </div>
                )}

                {/* Create Button - Floating Action Button Modal */}
                <CreateActivityModal courses={courses} />
            </main>
        </div>
    )
}
