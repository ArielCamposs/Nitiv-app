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

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const activityType = formData.get('activityType') as string
    const status = formData.get('status') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const coursesJson = formData.get('courses') as string
    const responsiblesJson = formData.get('responsibles') as string

    const courses = JSON.parse(coursesJson) as string[]
    const responsibles = JSON.parse(responsiblesJson) as string[]

    // Create the activity
    const { data: activity, error: activityError } = await supabase
        .from('school_activities')
        .insert({
            teacher_id: user.id,
            title,
            description,
            activity_type: activityType,
            status,
            start_date: startDate,
            end_date: endDate || null
        })
        .select()
        .single()

    if (activityError) {
        console.error('Error creating activity:', activityError)
        return { error: activityError.message }
    }

    // Insert activity courses
    if (courses.length > 0) {
        const coursesData = courses.map(courseId => ({
            activity_id: activity.id,
            course_id: courseId
        }))

        const { error: coursesError } = await supabase
            .from('activity_courses')
            .insert(coursesData)

        if (coursesError) {
            console.error('Error adding courses:', coursesError)
            // Rollback: delete the activity
            await supabase.from('school_activities').delete().eq('id', activity.id)
            return { error: coursesError.message }
        }
    }

    // Insert activity responsibles
    if (responsibles.length > 0) {
        const responsiblesData = responsibles.map(responsibleId => ({
            activity_id: activity.id,
            responsible_id: responsibleId
        }))

        const { error: responsiblesError } = await supabase
            .from('activity_responsibles')
            .insert(responsiblesData)

        if (responsiblesError) {
            console.error('Error adding responsibles:', responsiblesError)
            // Rollback: delete the activity and courses
            await supabase.from('school_activities').delete().eq('id', activity.id)
            return { error: responsiblesError.message }
        }
    }

    revalidatePath('/dashboard/professional/activities')
    revalidatePath('/dashboard/professional')
    revalidatePath('/dashboard/teacher/activities')
    return { success: true }
}

export async function deleteActivity(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const activityId = formData.get('activityId') as string

    // Delete activity (junction tables will be deleted automatically via CASCADE)
    const { error } = await supabase
        .from('school_activities')
        .delete()
        .eq('id', activityId)

    if (error) {
        console.error('Error deleting activity:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/professional/activities')
    revalidatePath('/dashboard/professional')
    revalidatePath('/dashboard/teacher/activities')
    return { success: true }
}

export async function updateActivity(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const activityId = formData.get('activityId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const activityType = formData.get('activityType') as string
    const status = formData.get('status') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const coursesJson = formData.get('courses') as string
    const responsiblesJson = formData.get('responsibles') as string

    const courses = JSON.parse(coursesJson) as string[]
    const responsibles = JSON.parse(responsiblesJson) as string[]

    // Update the activity
    const { error: activityError } = await supabase
        .from('school_activities')
        .update({
            title,
            description,
            activity_type: activityType,
            status,
            start_date: startDate,
            end_date: endDate || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', activityId)

    if (activityError) {
        console.error('Error updating activity:', activityError)
        return { error: activityError.message }
    }

    // Update courses: delete all and re-insert
    await supabase.from('activity_courses').delete().eq('activity_id', activityId)

    if (courses.length > 0) {
        const coursesData = courses.map(courseId => ({
            activity_id: activityId,
            course_id: courseId
        }))

        const { error: coursesError } = await supabase
            .from('activity_courses')
            .insert(coursesData)

        if (coursesError) {
            console.error('Error updating courses:', coursesError)
            return { error: coursesError.message }
        }
    }

    // Update responsibles: delete all and re-insert
    await supabase.from('activity_responsibles').delete().eq('activity_id', activityId)

    if (responsibles.length > 0) {
        const responsiblesData = responsibles.map(responsibleId => ({
            activity_id: activityId,
            responsible_id: responsibleId
        }))

        const { error: responsiblesError } = await supabase
            .from('activity_responsibles')
            .insert(responsiblesData)

        if (responsiblesError) {
            console.error('Error updating responsibles:', responsiblesError)
            return { error: responsiblesError.message }
        }
    }

    revalidatePath('/dashboard/professional/activities')
    revalidatePath('/dashboard/professional')
    revalidatePath('/dashboard/teacher/activities')
    return { success: true }
}
