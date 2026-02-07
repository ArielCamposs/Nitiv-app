import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrendingUp, Users, AlertTriangle, FileText, ArrowLeft, Sparkles } from 'lucide-react'
import ProfessionalBottomNav from '@/components/ProfessionalBottomNav'
import Link from 'next/link'
import { getStatistics, getEmotionDistribution, getWeeklyEvolution, generateAIAnalysis } from './actions'
import EmotionChart from './EmotionChart'
import WeeklyEvolutionChart from './WeeklyEvolutionChart'
import AIAnalysis from './AIAnalysis'

export default async function StatisticsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch all data
    const stats = await getStatistics()
    const emotions = await getEmotionDistribution()
    const evolution = await getWeeklyEvolution()

    if ('error' in stats) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
                <p className="text-red-600">Error: {stats.error}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            <ProfessionalBottomNav />

            {/* Header */}
            <header className="p-6 bg-gradient-to-br from-white to-[#F8F9FA] shadow-sm mb-6 border-b-2 border-gray-200">
                <Link href="/dashboard/professional" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3">
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>
                <h1 className="text-2xl font-bold text-[#475569] flex items-center gap-2">
                    <TrendingUp className="text-orange-500" />
                    Estadísticas Institucionales
                </h1>
                <p className="text-[#64748B]">Análisis del bienestar y métricas clave</p>
            </header>

            <main className="px-6 space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Active Students */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Users size={20} className="text-blue-500" />
                            <p className="text-sm text-gray-600">Estudiantes Activos</p>
                        </div>
                        <p className="text-3xl font-bold text-blue-600">{stats.activeStudents}</p>
                    </div>

                    {/* Average Wellbeing */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={20} className="text-green-500" />
                            <p className="text-sm text-gray-600">Bienestar Promedio</p>
                        </div>
                        <p className="text-3xl font-bold text-green-600">{stats.avgWellbeing}<span className="text-lg text-gray-400">/10</span></p>
                        <p className="text-xs text-gray-400 mt-1">Últimos 7 días</p>
                    </div>

                    {/* Active Alerts */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={20} className="text-red-500" />
                            <p className="text-sm text-gray-600">Alertas Activas</p>
                        </div>
                        <p className="text-3xl font-bold text-red-600">{stats.activeAlerts}</p>
                    </div>

                    {/* Weekly Records */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText size={20} className="text-purple-500" />
                            <p className="text-sm text-gray-600">Registros Semanales</p>
                        </div>
                        <p className="text-3xl font-bold text-purple-600">{stats.weeklyRecords}</p>
                    </div>
                </div>

                {/* AI Analysis Section */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow-sm border border-purple-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="text-purple-600" size={24} />
                        <h2 className="text-xl font-bold text-[#475569]">Análisis IA del Bienestar Institucional</h2>
                    </div>
                    <AIAnalysis />
                </div>

                {/* Charts Section */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Emotion Distribution */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-[#475569] mb-4">Distribución de Emociones</h2>
                        <p className="text-sm text-gray-500 mb-4">Últimos 7 días</p>
                        {emotions.length > 0 ? (
                            <EmotionChart data={emotions} />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-400">
                                <p>No hay datos de emociones disponibles</p>
                            </div>
                        )}
                    </div>

                    {/* Weekly Evolution */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-[#475569] mb-4">Evolución Semanal del Bienestar</h2>
                        <p className="text-sm text-gray-500 mb-4">Últimas 4 semanas</p>
                        {evolution.length > 0 ? (
                            <WeeklyEvolutionChart data={evolution} />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-400">
                                <p>No hay datos de evolución disponibles</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional Insights */}
                {emotions.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-[#475569] mb-4">Emociones Más Frecuentes</h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {emotions.slice(0, 5).map((emotion, index) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-2xl mb-1">{getEmotionEmoji(emotion.emotion)}</p>
                                    <p className="font-semibold text-gray-700 capitalize">{emotion.emotion}</p>
                                    <p className="text-sm text-gray-500">{emotion.count} registros</p>
                                    <p className="text-xs text-gray-400">{emotion.percentage}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

function getEmotionEmoji(emotion: string): string {
    const emojiMap: { [key: string]: string } = {
        'feliz': '😊',
        'triste': '😢',
        'enojado': '😠',
        'ansioso': '😰',
        'calmado': '😌',
        'emocionado': '🤩',
        'aburrido': '😑',
        'confundido': '😕',
        'orgulloso': '😎',
        'asustado': '😨'
    }
    return emojiMap[emotion.toLowerCase()] || '😐'
}

