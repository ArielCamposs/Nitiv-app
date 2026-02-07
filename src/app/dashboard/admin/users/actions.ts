'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getAllUsers() {
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

    const { data: users, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            created_at,
            metadata
        `)
        .eq('institution_id', profile.institution_id)
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message }
    }

    // Get email from auth.users for each profile
    const usersWithEmail = await Promise.all(
        (users || []).map(async (userProfile) => {
            const supabaseAdmin = await createAdminClient()
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userProfile.id)
            return {
                ...userProfile,
                email: authUser.user?.email || ''
            }
        })
    )

    return { users: usersWithEmail }
}

export async function getUsersByRole(role: string) {
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

    const { data: users, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            created_at,
            metadata
        `)
        .eq('institution_id', profile.institution_id)
        .eq('role', role)
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message }
    }

    // Get email from auth.users for each profile
    const usersWithEmail = await Promise.all(
        (users || []).map(async (userProfile) => {
            const supabaseAdmin = await createAdminClient()
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userProfile.id)
            return {
                ...userProfile,
                email: authUser.user?.email || ''
            }
        })
    )

    return { users: usersWithEmail }
}

export async function deleteUser(userId: string) {
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

    // Verify user belongs to same institution
    const { data: targetUser } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', userId)
        .single()

    if (!targetUser || targetUser.institution_id !== profile.institution_id) {
        return { error: 'Usuario no encontrado o no pertenece a tu institución' }
    }

    // Delete from auth.users (will cascade to profiles)
    const supabaseAdmin = await createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function createUser(data: {
    email: string
    password: string
    full_name: string
    role: string
    course_id?: string
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

    // Create user in auth.users
    const supabaseAdmin = await createAdminClient()
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true
    })

    if (authError || !newUser.user) {
        return { error: authError?.message || 'Error al crear usuario' }
    }

    // Update profile
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: data.full_name,
            role: data.role,
            institution_id: profile.institution_id
        })
        .eq('id', newUser.user.id)

    if (profileError) {
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return { error: profileError.message }
    }

    // If student and course_id provided, enroll in course
    if (data.role === 'student' && data.course_id) {
        await supabase
            .from('enrollments')
            .insert({
                student_id: newUser.user.id,
                course_id: data.course_id
            })
    }

    return { success: true, user: newUser.user }
}

export async function updateUser(userId: string, data: {
    full_name?: string
    role?: string
    course_id?: string
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

    // Verify user belongs to same institution
    const { data: targetUser } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', userId)
        .single()

    if (!targetUser || targetUser.institution_id !== profile.institution_id) {
        return { error: 'Usuario no encontrado o no pertenece a tu institución' }
    }

    // Build update data with only valid profile fields
    const updateData: any = {
        institution_id: targetUser.institution_id // Preserve institution_id
    }

    if (data.full_name !== undefined) updateData.full_name = data.full_name
    if (data.role !== undefined) updateData.role = data.role

    const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
