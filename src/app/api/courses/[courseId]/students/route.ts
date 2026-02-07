import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const courseId = params.courseId

        // Fetch students enrolled in this course
        const { data: students, error } = await supabase
            .from('enrollments')
            .select('student:profiles!enrollments_student_id_fkey(id, full_name)')
            .eq('course_id', courseId)

        if (error) {
            console.error('Error fetching students:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Extract student data
        const studentsList = students?.map(e => e.student).filter(Boolean) || []

        return NextResponse.json(studentsList, { status: 200 })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
