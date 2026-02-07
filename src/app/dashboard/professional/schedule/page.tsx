import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import ProfessionalBottomNav from '@/components/ProfessionalBottomNav'
import ScheduleClientWrapper from '../components/ScheduleClientWrapper'

export default async function SchedulePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch profile to get institution
    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    // Fetch students from same institution
    const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('institution_id', profile?.institution_id)
        .eq('role', 'student')
        .order('full_name')

    // Get current month appointments
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const { data: appointments } = await supabase
        .from('appointments')
        .select(`
            *,
            student:profiles!appointments_student_id_fkey(id, full_name)
        `)
        .eq('professional_id', user.id)
        .gte('appointment_date', startOfMonth.toISOString())
        .lte('appointment_date', endOfMonth.toISOString())
        .order('appointment_date', { ascending: true })

    const allAppointments = appointments || []

    // Get upcoming appointments (next 7 days)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const upcomingAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date)
        return aptDate >= today && aptDate < nextWeek
    })

    const monthName = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <ProfessionalBottomNav />

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-[#475569] mb-2">Agenda y Calendario</h1>
                            <p className="text-gray-500 capitalize">{monthName}</p>
                        </div>
                        <ScheduleClientWrapper students={students || []} />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calendar */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[#475569] capitalize">{monthName}</h2>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                        <ChevronLeft size={20} className="text-gray-600" />
                                    </button>
                                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                        <ChevronRight size={20} className="text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2">
                                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                                    <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                                        {day}
                                    </div>
                                ))}

                                {/* Calendar days - simplified view */}
                                {Array.from({ length: 35 }, (_, i) => {
                                    const dayNum = i - startOfMonth.getDay() + 1
                                    const isCurrentMonth = dayNum > 0 && dayNum <= endOfMonth.getDate()
                                    const date = new Date(now.getFullYear(), now.getMonth(), dayNum)
                                    const isToday = isCurrentMonth && dayNum === now.getDate()

                                    // Count appointments for this day
                                    const dayAppointments = isCurrentMonth ? allAppointments.filter(apt => {
                                        const aptDate = new Date(apt.appointment_date)
                                        return aptDate.getDate() === dayNum &&
                                            aptDate.getMonth() === now.getMonth() &&
                                            aptDate.getFullYear() === now.getFullYear()
                                    }).length : 0

                                    return (
                                        <div
                                            key={i}
                                            className={`
                                                aspect-square p-2 rounded-lg text-center relative
                                                ${isCurrentMonth ? 'bg-white hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'}
                                                ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                                            `}
                                        >
                                            <span className={`
                                                text-sm font-medium
                                                ${isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}
                                                ${isToday ? 'text-blue-600 font-bold' : ''}
                                            `}>
                                                {isCurrentMonth ? dayNum : ''}
                                            </span>
                                            {dayAppointments > 0 && (
                                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                                                    {Array.from({ length: Math.min(dayAppointments, 3) }, (_, i) => (
                                                        <div key={i} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Monthly Summary */}
                        <div className="grid grid-cols-3 gap-4 mt-6">
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <p className="text-sm text-gray-500">Total del Mes</p>
                                <p className="text-2xl font-bold text-[#475569] mt-1">{allAppointments.length}</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <p className="text-sm text-gray-500">Completadas</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">
                                    {allAppointments.filter(a => a.status === 'completed').length}
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <p className="text-sm text-gray-500">Próximas</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">
                                    {allAppointments.filter(a => a.status === 'scheduled').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Appointments Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-8">
                            <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                                <Clock className="text-green-500" size={20} />
                                Próximas 7 Días
                            </h3>

                            <div className="space-y-4">
                                {upcomingAppointments.length > 0 ? (
                                    upcomingAppointments.map((apt) => {
                                        const aptDate = new Date(apt.appointment_date)
                                        const dayStr = aptDate.toLocaleDateString('es-CL', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short'
                                        })
                                        const timeStr = aptDate.toLocaleTimeString('es-CL', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        })

                                        return (
                                            <div key={apt.id} className="border-l-4 border-green-500 pl-4 py-2 hover:bg-gray-50 rounded-r-lg transition-colors">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">{dayStr}</p>
                                                <p className="font-bold text-sm text-[#475569]">
                                                    {apt.student?.full_name || 'Sin asignar'}
                                                </p>
                                                <p className="text-sm text-gray-600">{apt.title}</p>
                                                <p className="text-xs text-gray-400 mt-1">{timeStr} • {apt.duration_minutes} min</p>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No hay sesiones próximas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

