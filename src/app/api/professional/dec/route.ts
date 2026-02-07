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
            course_id,
            student_id,
            event_date,
            event_time,
            location,
            activity,
            context_description,
            intervening_people,
            guardian_contacted,
            incident_types,
            intensity_level,
            triggering_situations,
            actions_taken,
            additional_observations
        } = body

        // Validate required fields
        if (!student_id || !event_date || !event_time || !location || !activity ||
            !context_description || !incident_types.length || !intensity_level ||
            !triggering_situations.length || !actions_taken.length) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Create DEC record
        const { data, error } = await supabase
            .from('dec_records')
            .insert({
                professional_id: user.id,
                student_id,
                course_id,
                event_date,
                event_time,
                location,
                activity,
                context_description,
                intervening_people,
                guardian_contacted,
                incident_types,
                intensity_level,
                triggering_situations,
                actions_taken,
                additional_observations
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating DEC record:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's institution
        const { data: profile } = await supabase
            .from('profiles')
            .select('institution_id')
            .eq('id', user.id)
            .single()

        // Fetch DEC records from same institution
        const { data: decRecords, error } = await supabase
            .from('dec_records')
            .select(`
                *,
                student:profiles!dec_records_student_id_fkey(id, full_name),
                course:courses(name, level)
            `)
            .eq('professional_id', user.id)
            .order('event_date', { ascending: false })
            .order('event_time', { ascending: false })

        if (error) {
            console.error('Error fetching DEC records:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(decRecords, { status: 200 })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
