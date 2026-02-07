'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // 1. Authenticate User
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        redirect('/login?error=Contraseña o correo inválido')
    }

    // 2. Fetch User Profile to get Role
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?error=Error de sesión')
    }

    // Use manual query since we can't use generated types yet or complex joins easily without them being set up perfectly
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
        // Fallback if no profile exists (e.g. superadmin not in profile table yet, or error)
        // Ideally every user has a profile.
        console.error('Profile fetch error:', profileError)
        redirect('/login?error=Perfil no encontrado')
    }

    revalidatePath('/', 'layout')

    // 3. Redirect based on Role
    switch (profile.role) {
        case 'student':
            redirect('/dashboard/student')
        case 'teacher':
            redirect('/dashboard/teacher')
        case 'professional':
            redirect('/dashboard/professional')
        case 'admin':
            redirect('/dashboard/admin')
        case 'superadmin':
            redirect('/dashboard/admin') // Or superadmin panel
        default:
            redirect('/')
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
