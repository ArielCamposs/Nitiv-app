import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Search, Filter } from 'lucide-react'
import ProfessionalBottomNav from '@/components/ProfessionalBottomNav'
import Link from 'next/link'
import RecordsClientWrapper from '../components/RecordsClientWrapper'

export default async function RecordsPage() {
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

    // Fetch all cases for this professional
    const { data: cases } = await supabase
        .from('cases')
        .select(`
            *,
            student:profiles!cases_student_id_fkey(id, full_name, email),
            appointments(id, appointment_date, status)
        `)
        .eq('professional_id', user.id)
        .order('created_at', { ascending: false })

    const allCases = cases || []
    const activeCases = allCases.filter(c => c.status === 'active')
    const inactiveCases = allCases.filter(c => c.status !== 'active')

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <ProfessionalBottomNav />

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-[#475569] mb-2">Registros</h1>
                            <p className="text-gray-500">Gestión de registros y seguimientos</p>
                        </div>
                        <RecordsClientWrapper courses={courses || []} />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Total de Casos</p>
                        <p className="text-3xl font-bold text-[#475569]">{allCases.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Casos Activos</p>
                        <p className="text-3xl font-bold text-blue-600">{activeCases.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Casos Cerrados</p>
                        <p className="text-3xl font-bold text-gray-400">{inactiveCases.length}</p>
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
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                            <Filter size={20} />
                            Filtros
                        </button>
                    </div>
                </div>

                {/* Cases List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Estudiante
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Título
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Sesiones
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Fecha Inicio
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {allCases.length > 0 ? (
                                    allCases.map((caseItem) => {
                                        const sessionCount = caseItem.appointments?.length || 0
                                        const createdDate = new Date(caseItem.created_at).toLocaleDateString('es-CL')

                                        return (
                                            <tr key={caseItem.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                                                            {Array.isArray((caseItem as any).student) ? (caseItem as any).student[0]?.full_name?.charAt(0) : (caseItem as any).student?.full_name?.charAt(0) || 'S'}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-[#475569]">
                                                                {Array.isArray((caseItem as any).student) ? (caseItem as any).student[0]?.full_name : (caseItem as any).student?.full_name || 'Sin nombre'}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                {Array.isArray((caseItem as any).student) ? (caseItem as any).student[0]?.email : (caseItem as any).student?.email || ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-[#475569]">{caseItem.title || 'Sin título'}</p>
                                                    {caseItem.summary && (
                                                        <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                                                            {caseItem.summary}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${caseItem.status === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {caseItem.status === 'active' ? 'Activo' : 'Cerrado'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {sessionCount} sesiones
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-gray-500">{createdDate}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <Link
                                                            href={`/dashboard/professional/cases/${caseItem.id}`}
                                                            className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                                        >
                                                            Ver
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <Users size={48} className="mb-4 opacity-50" />
                                                <p className="font-medium">No hay casos registrados</p>
                                                <p className="text-sm mt-1">Crea un nuevo caso para comenzar</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}

