'use server'

import { createClient } from '@/lib/supabase/server'

export async function getAllCourses() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        return { error: 'No autorizado' }
    }

    const { data: courses, error } = await supabase
        .from('courses')
        .select(`
            id,
            name,
            grade,
            created_at,
            enrollments (count)
        `)
        .eq('institution_id', profile.institution_id)
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message }
    }

    return { courses }
}

export async function getCourseById(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        return { error: 'No autorizado' }
    }

    const { data: course, error } = await supabase
        .from('courses')
        .select(`
            id,
            name,
            grade,
            created_at,
            enrollments (
                id,
                student_id,
                profiles!enrollments_student_id_fkey (
                    id,
                    full_name
                )
            )
        `)
        .eq('id', courseId)
        .eq('institution_id', profile.institution_id)
        .single()

    if (error) {
        return { error: error.message }
    }

    return { course }
}

export async function createCourse(data: {
    name: string
    grade: string
    student_ids?: string[]
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        return { error: 'No autorizado' }
    }

    // Create course
    const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert({
            name: data.name,
            grade: data.grade,
            institution_id: profile.institution_id
        })
        .select()
        .single()

    if (courseError || !newCourse) {
        return { error: courseError?.message || 'Error al crear curso' }
    }

    // Enroll students if provided
    if (data.student_ids && data.student_ids.length > 0) {
        const enrollments = data.student_ids.map(student_id => ({
            course_id: newCourse.id,
            student_id
        }))

        const { error: enrollError } = await supabase
            .from('enrollments')
            .insert(enrollments)

        if (enrollError) {
            // Rollback: delete course
            await supabase.from('courses').delete().eq('id', newCourse.id)
            return { error: 'Error al inscribir estudiantes: ' + enrollError.message }
        }
    }

    return { success: true, course: newCourse }
}

export async function updateCourse(courseId: string, data: {
    name?: string
    grade?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        return { error: 'No autorizado' }
    }

    // Verify course belongs to same institution
    const { data: course } = await supabase
        .from('courses')
        .select('institution_id')
        .eq('id', courseId)
        .single()

    if (!course || course.institution_id !== profile.institution_id) {
        return { error: 'Curso no encontrado o no pertenece a tu institución' }
    }

    const updateData: any = {
        institution_id: course.institution_id
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.grade !== undefined) updateData.grade = data.grade

    const { error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', courseId)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function deleteCourse(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        return { error: 'No autorizado' }
    }

    // Verify course belongs to same institution
    const { data: course } = await supabase
        .from('courses')
        .select('institution_id')
        .eq('id', courseId)
        .single()

    if (!course || course.institution_id !== profile.institution_id) {
        return { error: 'Curso no encontrado o no pertenece a tu institución' }
    }

    // Delete course (enrollments will cascade)
    const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function getStudents() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        return { error: 'No autorizado' }
    }

    const { data: students, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('institution_id', profile.institution_id)
        .eq('role', 'student')
        .order('full_name')

    if (error) {
        return { error: error.message }
    }

    return { students }
}
