import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, CheckCircle2, Circle, ArrowLeft } from 'lucide-react'
import { completeMission } from './actions'
import StudentBottomNav from '@/components/StudentBottomNav'

// Client Component Wrapper for interactions
import MissionItem from './MissionItem'

export default async function MissionsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch all missions
    const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .order('points_reward', { ascending: true })

    // Fetch user progress
    const { data: progress } = await supabase
        .from('student_missions')
        .select('mission_id, status')
        .eq('student_id', user.id)

    const completedIds = new Set(progress?.filter(p => p.status === 'completed').map(p => p.mission_id))

    // Calculate total points
    const totalPoints = missions?.reduce((acc, m) => {
        return completedIds.has(m.id) ? acc + m.points_reward : acc
    }, 0) || 0

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-28">
            <StudentBottomNav />
            <header className="p-6 bg-gradient-to-br from-purple-100 to-purple-200 text-[#475569] shadow-md rounded-b-3xl mb-6 border-b-2 border-purple-300">
                <h1 className="text-3xl font-bold mb-2">🎮 Misiones y Logros</h1>
                <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-600" />
                    <span className="font-bold text-xl">{totalPoints} Puntos</span>
                </div>
            </header>

            <main className="p-6 space-y-4">
                {missions?.map(mission => (
                    <MissionItem
                        key={mission.id}
                        mission={mission}
                        isCompleted={completedIds.has(mission.id)}
                    />
                ))}

                {(!missions || missions.length === 0) && (
                    <p className="text-center text-gray-500 mt-10">No hay misiones disponibles por ahora.</p>
                )}
            </main>
        </div>
    )
}
