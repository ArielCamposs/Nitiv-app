'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function markAlertRead(formData: FormData) {
    const supabase = await createClient()
    const alertId = formData.get('alertId') as string

    if (!alertId) {
        return { error: 'Alert ID is required' }
    }

    const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId)

    if (error) {
        console.error('Error marking alert as read:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/teacher/alerts')
    revalidatePath('/dashboard/teacher')
    return { success: true }
}
