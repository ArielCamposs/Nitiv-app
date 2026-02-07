'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createActivity(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const courseId = formData.get('courseId') as string
    const title = formData.get('title') as string
    const activityType = formData.get('activityType') as string
    const activityDate = formData.get('activityDate') as string
    const description = formData.get('description') as string

    const { error } = await supabase
        .from('school_activities')
        .insert({
            teacher_id: user.id,
            course_id: courseId,
            title,
            activity_type: activityType,
            activity_date: activityDate,
            description: description || null
        })

    if (error) {
        console.error('Error creating activity:', error)
        throw new Error(error.message)
    }

    revalidatePath('/dashboard/teacher/activities')
    revalidatePath('/dashboard/teacher')
}

export async function deleteActivity(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const activityId = formData.get('activityId') as string

    const { error } = await supabase
        .from('school_activities')
        .delete()
        .eq('id', activityId)
        .eq('teacher_id', user.id)

    if (error) {
        console.error('Error deleting activity:', error)
        throw new Error(error.message)
    }

    revalidatePath('/dashboard/teacher/activities')
    revalidatePath('/dashboard/teacher')
}
