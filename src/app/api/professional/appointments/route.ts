import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { student_id, title, description, appointment_date, duration_minutes } = body

        // Create appointment
        const { data, error } = await supabase
            .from('appointments')
            .insert({
                professional_id: user.id,
                student_id: student_id || null,
                title,
                description: description || null,
                appointment_date,
                duration_minutes: duration_minutes || 60,
                status: 'scheduled'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating appointment:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
