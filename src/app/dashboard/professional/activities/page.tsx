import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, ArrowLeft, Users, MapPin } from 'lucide-react'
import ProfessionalBottomNav from '@/components/ProfessionalBottomNav'
import Link from 'next/link'
import { deleteActivity } from './actions'
import CreateActivityModal from './CreateActivityModal'

export default async function ActivitiesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch professional's institution
    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    // Fetch all courses from the institution
    const { data: courses } = await supabase
        .from('courses')
        .select('id, name, grade')
        .eq('institution_id', profile?.institution_id)
        .order('name')

    // Fetch all staff (teachers and psychologists) from the institution
    const { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('institution_id', profile?.institution_id)
        .in('role', ['teacher', 'professional'])
        .order('full_name')

    // Fetch all activities with related data
    const { data: activities } = await supabase
        .from('school_activities')
        .select(`
            id,
            title,
            description,
            activity_type,
            status,
            start_date,
            end_date,
            created_at,
            creator:profiles!school_activities_teacher_id_fkey(full_name, role)
        `)
        .order('start_date', { ascending: true })

    // For each activity, fetch courses and responsibles
    const activitiesWithDetails = await Promise.all(
        (activities || []).map(async (activity) => {
            const { data: activityCourses } = await supabase
                .from('activity_courses')
                .select('course:courses(id, name, grade)')
                .eq('activity_id', activity.id)

            const { data: activityResponsibles } = await supabase
                .from('activity_responsibles')
                .select('responsible:profiles(id, full_name, role)')
                .eq('activity_id', activity.id)

            return {
                ...activity,
                courses: activityCourses?.map(ac => (ac.course as any)) || [],
                responsibles: activityResponsibles?.map(ar => (ar.responsible as any)) || []
            }
        })
    )

    const today = new Date().toISOString().split('T')[0]
    const upcoming = activitiesWithDetails.filter(a => a.start_date >= today)
    const past = activitiesWithDetails.filter(a => a.start_date < today)

    const getActivityTypeLabel = (type: string) => {
        switch (type) {
            case 'colegio': return 'Actividad del Colegio'
            case 'salida_pedagogica': return 'Salida Pedagógica'
            case 'entidad_externa': return 'Entidad Externa'
            default: return type
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'planificado': return 'Planificado'
            case 'en_curso': return 'En Curso'
            case 'realizada': return 'Realizada'
            default: return status
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'planificado': return 'bg-blue-100 text-blue-600'
            case 'en_curso': return 'bg-yellow-100 text-yellow-600'
            case 'realizada': return 'bg-green-100 text-green-600'
            default: return 'bg-gray-100 text-gray-600'
        }
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <ProfessionalBottomNav />

            {/* Header */}
            <header className="p-6 bg-gradient-to-br from-white to-[#F8F9FA] shadow-sm mb-6 border-b-2 border-gray-200">
                <Link href="/dashboard/professional" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3">
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-[#475569] flex items-center gap-2">
                            <Calendar className="text-green-500" />
                            Actividades Escolares
                        </h1>
                        <p className="text-[#64748B]">Gestiona actividades compartidas con profesores</p>
                    </div>
                    <CreateActivityModal courses={courses || []} staff={staff || []} />
                </div>
            </header>

            <main className="px-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">Próximas</p>
                        <p className="text-3xl font-bold text-green-600">{upcoming.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">En Curso</p>
                        <p className="text-3xl font-bold text-yellow-600">
                            {activitiesWithDetails.filter(a => a.status === 'en_curso').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">Total</p>
                        <p className="text-3xl font-bold text-gray-700">{activitiesWithDetails.length}</p>
                    </div>
                </div>

                {/* Upcoming Activities */}
                {upcoming.length > 0 && (
                    <section>
                        <h2 className="font-bold text-[#475569] mb-3 text-lg">Próximas Actividades ({upcoming.length})</h2>
                        <div className="space-y-3">
                            {upcoming.map((activity) => (
                                <div key={activity.id} className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-400">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${getStatusColor(activity.status)}`}>
                                                {getStatusLabel(activity.status)}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-purple-100 text-purple-600">
                                                {getActivityTypeLabel(activity.activity_type)}
                                            </span>
                                        </div>
                                        <form action={deleteActivity}>
                                            <input type="hidden" name="activityId" value={activity.id} />
                                            <button
                                                type="submit"
                                                className="text-xs text-red-600 hover:underline"
                                            >
                                                Eliminar
                                            </button>
                                        </form>
                                    </div>

                                    <h3 className="font-bold text-[#475569] text-lg">{activity.title}</h3>
                                    <p className="text-sm text-gray-600 mt-2">{activity.description}</p>

                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Calendar size={14} />
                                            <span>
                                                {new Date(activity.start_date).toLocaleDateString('es-ES', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long'
                                                })}
                                                {activity.end_date && ` - ${new Date(activity.end_date).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'long'
                                                })}`}
                                            </span>
                                        </div>

                                        {activity.courses.length > 0 && (
                                            <div className="flex items-start gap-2 text-sm text-gray-500">
                                                <MapPin size={14} className="mt-0.5" />
                                                <span>
                                                    {activity.courses.map(c => c.name).join(', ')}
                                                </span>
                                            </div>
                                        )}

                                        {activity.responsibles.length > 0 && (
                                            <div className="flex items-start gap-2 text-sm text-gray-500">
                                                <Users size={14} className="mt-0.5" />
                                                <span>
                                                    {activity.responsibles.map(r => r.full_name).join(', ')}
                                                </span>
                                            </div>
                                        )}
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
                                    <div className="flex gap-2 mb-2">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${getStatusColor(activity.status)}`}>
                                            {getStatusLabel(activity.status)}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-700">{activity.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(activity.start_date).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {activitiesWithDetails.length === 0 && (
                    <div className="bg-white rounded-2xl p-12 text-center">
                        <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium text-gray-500">No hay actividades registradas</p>
                        <p className="text-sm text-gray-400 mt-1">Haz click en "Nueva Actividad" para crear tu primera actividad</p>
                    </div>
                )}
            </main>
        </div>
    )
}

