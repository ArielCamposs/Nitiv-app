import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Gamepad2, ShoppingBag, User as UserIcon, CheckCircle2, TrendingUp } from 'lucide-react'
import MoodSelector from '@/components/ui/MoodSelector'
import StudentBottomNav from '@/components/StudentBottomNav'
import { startOfDay, endOfDay } from 'date-fns'

export default async function StudentDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

    // Check if already submitted today
    const todayStart = startOfDay(new Date()).toISOString()
    const todayEnd = endOfDay(new Date()).toISOString()

    const { data: todaysLog } = await supabase
        .from('mood_logs')
        .select('id, score')
        .eq('student_id', user.id)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .single()

    const hasCheckedIn = !!todaysLog

    // Fetch Weekly Stats
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - 6)
    startOfWeek.setHours(0, 0, 0, 0)

    const { data: weeklyLogs } = await supabase
        .from('mood_logs')
        .select('created_at, score')
        .eq('student_id', user.id)
        .gte('created_at', startOfWeek.toISOString())
        .order('created_at', { ascending: true })

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const dayData = Array(7).fill(null).map((_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dayOfWeek = date.getDay()
        const dayLog = weeklyLogs?.find(log => {
            const logDate = new Date(log.created_at)
            return logDate.toDateString() === date.toDateString()
        })
        return {
            day: weekDays[dayOfWeek],
            score: dayLog?.score || 0
        }
    })

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-28">
            <StudentBottomNav />
            {/* Header with Logout */}
            <header className="p-6 bg-gradient-to-br from-white to-[#F8F9FA] shadow-sm rounded-b-3xl mb-6 border-b-2 border-[#E9EDC9]">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#475569]">Hola, {profile?.full_name || 'Estudiante'} 👋</h1>
                        <p className="text-[#64748B]">
                            {hasCheckedIn ? "¡Gracias por compartir cómo te sientes!" : "¿Cómo estás hoy?"}
                        </p>
                    </div>
                </div>

                {/* Check-in Section */}
                {!hasCheckedIn ? (
                    <div className="bg-gradient-to-br from-[#CCD5AE] to-[#E9EDC9] rounded-2xl p-6 mt-4 shadow-md">
                        <h3 className="font-bold text-[#475569] mb-3 text-lg">✨ Check-in Diario</h3>
                        <MoodSelector />
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-[#D4E7C5] to-[#E9EDC9] rounded-2xl p-6 mt-4 flex items-center gap-4 shadow-md border-2 border-[#BFD8AF]">
                        <div className="w-14 h-14 bg-white/90 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 className="text-[#6B9F5E]" size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#475569] text-lg">¡Check-in Completado!</h3>
                            <p className="text-[#64748B]">Tu ánimo de hoy: <span className="font-bold text-[#6B9F5E]">{todaysLog.score}/5 ⭐</span></p>
                        </div>
                    </div>
                )}
            </header>

            {/* Weekly Chart */}
            <section className="px-6 mb-6">
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="text-[#475569]" size={20} />
                        <h3 className="font-bold text-[#475569]">Tendencia Semanal</h3>
                    </div>
                    <div className="flex items-end justify-between gap-2 h-40">
                        {dayData.map((data, i) => (
                            <div key={i} className="flex flex-col items-center flex-1">
                                <div className="w-full bg-gradient-to-t from-gray-100 to-gray-50 rounded-t-lg relative" style={{ height: '100%' }}>
                                    {data.score > 0 && (
                                        <div
                                            className="absolute bottom-0 w-full bg-gradient-to-t from-[#A9C088] via-[#CCD5AE] to-[#E9EDC9] rounded-t-lg transition-all shadow-sm"
                                            style={{ height: `${(data.score / 5) * 100}%` }}
                                        />
                                    )}
                                </div>
                                <span className="text-xs text-[#64748B] mt-2 font-semibold">{data.day}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}

