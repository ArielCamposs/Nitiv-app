'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitCheckIn(score: number, tags: string[], note: string | null) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('No autenticado')
    }

    // Fetch institution_id from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    if (!profile) throw new Error('Usuario sin perfil')

    const { error } = await supabase.from('mood_logs').insert({
        student_id: user.id,
        institution_id: profile.institution_id,
        score,
        tags,
        note
    })

    if (error) {
        console.error('Check-in error', error)
        throw new Error('Error al guardar')
    }

    revalidatePath('/dashboard/student')
    return { success: true }
}
