'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createObservation(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const studentId = formData.get('studentId') as string
    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const content = formData.get('content') as string

    // Get course ID for this student
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .single()

    const { error } = await supabase
        .from('observations')
        .insert({
            student_id: studentId,
            teacher_id: user.id,
            course_id: enrollment?.course_id,
            title,
            category,
            content
        })

    if (error) {
        console.error('Error creating observation:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/teacher/observations')
    return { success: true }
}

export async function deleteObservation(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const observationId = formData.get('observationId') as string

    const { error } = await supabase
        .from('observations')
        .delete()
        .eq('id', observationId)
        .eq('teacher_id', user.id)

    if (error) {
        console.error('Error deleting observation:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/teacher/observations')
    return { success: true }
}
