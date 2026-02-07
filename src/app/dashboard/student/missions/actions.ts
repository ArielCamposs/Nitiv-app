'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeMission(missionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Check if already completed
    const { data: existing } = await supabase
        .from('student_missions')
        .select('id')
        .eq('student_id', user.id)
        .eq('mission_id', missionId)
        .eq('status', 'completed')
        .single()

    if (existing) return { success: false, message: 'Already completed' }

    // Insert completion
    const { error } = await supabase
        .from('student_missions')
        .insert({
            student_id: user.id,
            mission_id: missionId,
            status: 'completed',
            completed_at: new Date().toISOString()
        })

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/student')
    revalidatePath('/dashboard/student/missions')
    return { success: true }
}
