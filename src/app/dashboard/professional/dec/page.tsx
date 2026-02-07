import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle, Search, Filter, Clock, MapPin } from 'lucide-react'
import ProfessionalBottomNav from '@/components/ProfessionalBottomNav'
import DECClientWrapper from '../components/DECClientWrapper'

export default async function DECPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch profile to get institution
    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    // Fetch courses from same institution
    const { data: courses } = await supabase
        .from('courses')
        .select('id, name, level')
        .eq('institution_id', profile?.institution_id)
        .order('name')

    // Fetch all DEC records
    const { data: decRecords } = await supabase
        .from('dec_records')
        .select(`
            *,
            student:profiles!dec_records_student_id_fkey(id, full_name),
            course:courses(name, level)
        `)
        .eq('professional_id', user.id)
        .order('event_date', { ascending: false })
        .order('event_time', { ascending: false })

    const allRecords = decRecords || []
    const moderateRecords = allRecords.filter(r => r.intensity_level === 'etapa_2_moderada')
    const severeRecords = allRecords.filter(r => r.intensity_level === 'etapa_3_severa')

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <ProfessionalBottomNav />

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-[#475569] mb-2">Registros DEC</h1>
                            <p className="text-gray-500">Desregulaciones Emocionales y Conductuales</p>
                        </div>
                        <DECClientWrapper courses={courses || []} />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Total de Registros</p>
                        <p className="text-3xl font-bold text-[#475569]">{allRecords.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Desregulación Moderada</p>
                        <p className="text-3xl font-bold text-orange-600">{moderateRecords.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Desregulación Severa</p>
                        <p className="text-3xl font-bold text-red-600">{severeRecords.length}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por estudiante..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                            <Filter size={20} />
                            Filtros
                        </button>
                    </div>
                </div>

                {/* DEC Records List */}
                <div className="space-y-4">
                    {allRecords.length > 0 ? (
                        allRecords.map((record) => {
                            const eventDate = new Date(record.event_date).toLocaleDateString('es-CL')
                            const isModerate = record.intensity_level === 'etapa_2_moderada'

                            return (
                                <div
                                    key={record.id}
                                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isModerate ? 'bg-orange-100' : 'bg-red-100'
                                                }`}>
                                                <AlertTriangle className={isModerate ? 'text-orange-600' : 'text-red-600'} size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-[#475569]">
                                                    {record.student?.full_name || 'Sin nombre'}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {record.course?.name} - {record.course?.level}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${isModerate
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {isModerate ? 'Etapa 2 - Moderada' : 'Etapa 3 - Severa'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock size={16} className="text-gray-400" />
                                            <span>{eventDate} - {record.event_time}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <MapPin size={16} className="text-gray-400" />
                                            <span>{record.location}</span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-gray-600 mb-2">
                                            <strong>Actividad:</strong> {record.activity}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <strong>Contexto:</strong> {record.context_description}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {record.incident_types?.map((type: string, idx: number) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            <strong>Situaciones desencadenantes:</strong>{' '}
                                            {Array.isArray(record.triggering_situations)
                                                ? record.triggering_situations.join(', ')
                                                : record.triggering_situations}
                                        </div>
                                        <button className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                                            Ver detalles
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
                            <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="font-medium text-gray-600">No hay registros DEC</p>
                            <p className="text-sm text-gray-400 mt-1">Crea un nuevo registro para comenzar</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

