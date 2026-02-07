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
        const {
            record_type,
            record_date,
            record_time,
            course_id,
            student_id,
            severity,
            title,
            description,
            actions,
            confidentiality
        } = body

        // Create record
        const { data, error } = await supabase
            .from('cases')
            .insert({
                professional_id: user.id,
                student_id,
                course_id,
                title,
                summary: description, // Keep for backwards compatibility
                description,
                status: 'active',
                record_type,
                record_date,
                record_time,
                severity,
                actions,
                confidentiality
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating record:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
