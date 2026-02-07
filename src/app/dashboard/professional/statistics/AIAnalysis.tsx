'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { generateAIAnalysis } from './actions'

export default function AIAnalysis() {
    const [analysis, setAnalysis] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [hasGenerated, setHasGenerated] = useState(false)

    const handleGenerateAnalysis = async () => {
        setLoading(true)
        setHasGenerated(true)
        const result = await generateAIAnalysis()
        setAnalysis(result.analysis)
        setLoading(false)
    }

    if (!hasGenerated) {
        return (
            <div className="flex flex-col items-center justify-center py-8">
                <Sparkles className="text-purple-400 mb-4" size={48} />
                <p className="text-gray-600 mb-4">Genera un análisis detallado del bienestar institucional</p>
                <button
                    onClick={handleGenerateAnalysis}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                >
                    <Sparkles size={20} />
                    Generar Análisis con IA
                </button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-purple-600" size={32} />
                <p className="ml-3 text-gray-600">Generando análisis con IA...</p>
            </div>
        )
    }

    return (
        <div>
            <div className="prose prose-sm max-w-none mb-4">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {analysis}
                </div>
            </div>
            <button
                onClick={handleGenerateAnalysis}
                className="px-4 py-2 text-sm bg-white text-purple-600 border-2 border-purple-300 rounded-lg font-semibold hover:bg-purple-50 transition-all duration-200 flex items-center gap-2"
            >
                <Sparkles size={16} />
                Regenerar Análisis
            </button>
        </div>
    )
}
