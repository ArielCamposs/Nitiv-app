'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getStatistics() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get user's institution
    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    if (!profile?.institution_id) {
        return { error: 'No institution found' }
    }

    // Get active students count
    const { count: activeStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile.institution_id)
        .eq('role', 'student')

    // Get average wellbeing from last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentRecords } = await supabase
        .from('daily_records')
        .select('wellbeing_level, student:profiles!daily_records_student_id_fkey(institution_id)')
        .gte('created_at', sevenDaysAgo.toISOString())

    const institutionRecords = recentRecords?.filter(
        (r: any) => r.student?.institution_id === profile.institution_id
    ) || []

    const avgWellbeing = institutionRecords.length > 0
        ? institutionRecords.reduce((sum: number, r: any) => sum + (r.wellbeing_level || 0), 0) / institutionRecords.length
        : 0

    // Get active alerts count
    const { count: activeAlerts } = await supabase
        .from('student_alerts')
        .select('*, student:profiles!student_alerts_student_id_fkey(institution_id)', { count: 'exact', head: true })
        .eq('resolved', false)

    // Get weekly records count
    const { data: weeklyRecordsData } = await supabase
        .from('daily_records')
        .select('id, student:profiles!daily_records_student_id_fkey(institution_id)')
        .gte('created_at', sevenDaysAgo.toISOString())

    const weeklyRecords = weeklyRecordsData?.filter(
        (r: any) => r.student?.institution_id === profile.institution_id
    ).length || 0

    return {
        activeStudents: activeStudents || 0,
        avgWellbeing: Math.round(avgWellbeing * 10) / 10,
        activeAlerts: activeAlerts || 0,
        weeklyRecords
    }
}

export async function getEmotionDistribution() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    if (!profile?.institution_id) return []

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: records } = await supabase
        .from('daily_records')
        .select('emotion, student:profiles!daily_records_student_id_fkey(institution_id)')
        .gte('created_at', sevenDaysAgo.toISOString())

    const institutionRecords = records?.filter(
        (r: any) => r.student?.institution_id === profile.institution_id
    ) || []

    // Count emotions
    const emotionCounts: { [key: string]: number } = {}
    institutionRecords.forEach((record: any) => {
        if (record.emotion) {
            emotionCounts[record.emotion] = (emotionCounts[record.emotion] || 0) + 1
        }
    })

    // Convert to array format for charts
    return Object.entries(emotionCounts).map(([emotion, count]) => ({
        emotion,
        count,
        percentage: Math.round((count / institutionRecords.length) * 100)
    }))
}

export async function getWeeklyEvolution() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    if (!profile?.institution_id) return []

    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const { data: records } = await supabase
        .from('daily_records')
        .select('wellbeing_level, created_at, student:profiles!daily_records_student_id_fkey(institution_id)')
        .gte('created_at', fourWeeksAgo.toISOString())
        .order('created_at', { ascending: true })

    const institutionRecords = records?.filter(
        (r: any) => r.student?.institution_id === profile.institution_id
    ) || []

    // Group by week
    const weeklyData: { [key: string]: { sum: number; count: number } } = {}

    institutionRecords.forEach((record: any) => {
        const date = new Date(record.created_at)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0]

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { sum: 0, count: 0 }
        }
        weeklyData[weekKey].sum += record.wellbeing_level || 0
        weeklyData[weekKey].count += 1
    })

    // Convert to array and calculate averages
    return Object.entries(weeklyData)
        .map(([week, data]) => ({
            week: new Date(week).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
            avgWellbeing: Math.round((data.sum / data.count) * 10) / 10
        }))
        .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
}

export async function generateAIAnalysis() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { analysis: 'Error: Usuario no autenticado' }

    // Get statistics data
    const stats = await getStatistics()
    const emotions = await getEmotionDistribution()
    const evolution = await getWeeklyEvolution()

    // Get recent alerts for context
    const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

    const { data: recentAlerts } = await supabase
        .from('student_alerts')
        .select('alert_type, severity, student:profiles!student_alerts_student_id_fkey(institution_id)')
        .eq('resolved', false)
        .limit(10)

    const institutionAlerts = recentAlerts?.filter(
        (a: any) => a.student?.institution_id === profile?.institution_id
    ) || []

    // Prepare data for AI
    const analysisData = {
        activeStudents: stats.activeStudents,
        avgWellbeing: stats.avgWellbeing,
        activeAlerts: stats.activeAlerts,
        weeklyRecords: stats.weeklyRecords,
        topEmotions: emotions.slice(0, 5),
        weeklyTrend: evolution,
        alertTypes: institutionAlerts.map((a: any) => ({ type: a.alert_type, severity: a.severity }))
    }

    const prompt = `Eres un psicólogo experto analizando el bienestar institucional. Analiza los siguientes datos y proporciona un análisis conciso y profesional en español:

Datos institucionales:
- Estudiantes activos: ${analysisData.activeStudents}
- Bienestar promedio (últimos 7 días): ${analysisData.avgWellbeing}/10
- Alertas activas: ${analysisData.activeAlerts}
- Registros esta semana: ${analysisData.weeklyRecords}

Emociones más frecuentes:
${analysisData.topEmotions.map(e => `- ${e.emotion}: ${e.count} registros (${e.percentage}%)`).join('\n')}

Tendencia semanal de bienestar:
${analysisData.weeklyTrend.map(w => `- ${w.week}: ${w.avgWellbeing}/10`).join('\n')}

Alertas activas por tipo:
${analysisData.alertTypes.slice(0, 5).map((a: any) => `- ${a.type} (${a.severity})`).join('\n')}

Proporciona:
1. Un resumen del estado general (2-3 líneas)
2. Principales hallazgos o tendencias (3-4 puntos)
3. Recomendaciones específicas (2-3 acciones concretas)

Sé conciso, profesional y enfócate en insights accionables.`

    try {
        // Use Gemini AI for analysis
        const { GoogleGenerativeAI } = require('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const result = await model.generateContent(prompt)
        const analysis = result.response.text()

        return { analysis }
    } catch (error) {
        console.error('Error generating AI analysis:', error)
        return { analysis: 'Error al generar el análisis. Por favor, intenta nuevamente.' }
    }
}
