'use client'

import { useState, useEffect } from 'react'
import { submitCheckIn } from '@/app/dashboard/student/actions'

const MOOD_CONFIG = {
    1: { emoji: '😞', label: 'Muy mal', color: 'from-red-400 to-red-600', shadowColor: 'shadow-red-400/50' },
    2: { emoji: '😕', label: 'Mal', color: 'from-orange-400 to-orange-600', shadowColor: 'shadow-orange-400/50' },
    3: { emoji: '😐', label: 'Regular', color: 'from-yellow-400 to-yellow-600', shadowColor: 'shadow-yellow-400/50' },
    4: { emoji: '🙂', label: 'Bien', color: 'from-green-400 to-green-600', shadowColor: 'shadow-green-400/50' },
    5: { emoji: '😊', label: 'Muy bien', color: 'from-emerald-400 to-emerald-600', shadowColor: 'shadow-emerald-400/50' },
}

export default function MoodSelector() {
    const [rawValue, setRawValue] = useState(3)
    const [loading, setLoading] = useState(false)
    const [isChanging, setIsChanging] = useState(false)
    const [prevMood, setPrevMood] = useState(3)

    const displayValue = Math.round(rawValue)
    const currentMood = MOOD_CONFIG[displayValue as keyof typeof MOOD_CONFIG]

    // Trigger animation when mood changes
    useEffect(() => {
        if (displayValue !== prevMood) {
            setIsChanging(true)
            setPrevMood(displayValue)
            setTimeout(() => setIsChanging(false), 500)
        }
    }, [displayValue, prevMood])

    async function handleSave() {
        setLoading(true)
        try {
            await submitCheckIn(displayValue, [], null)
        } catch (error) {
            alert('Error al guardar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Animated Face Display */}
            <div className="flex flex-col items-center gap-4">
                <span className={`
                    text-9xl transition-all duration-200
                    ${isChanging ? 'animate-bounce-scale' : 'hover:scale-110'}
                `}>
                    {currentMood.emoji}
                </span>
                <div className="text-center">
                    <p className={`
                        text-xl font-bold text-[#475569] transition-all duration-300
                        ${isChanging ? 'scale-110' : 'scale-100'}
                    `}>
                        {currentMood.label}
                    </p>
                    <p className="text-sm text-[#64748B] mt-1">Desliza para cambiar tu ánimo</p>
                </div>
            </div>

            {/* Smooth Slider */}
            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.01"
                        value={rawValue}
                        onChange={(e) => setRawValue(Number(e.target.value))}
                        className="w-full h-4 rounded-full appearance-none cursor-pointer slider"
                        style={{
                            background: `linear-gradient(to right, 
                                #f87171 0%, 
                                #fb923c 25%, 
                                #fbbf24 50%, 
                                #4ade80 75%, 
                                #34d399 100%)`
                        }}
                    />
                    {/* Progress indicator dots */}
                    <div className="absolute top-1/2 w-full flex justify-between px-2 pointer-events-none" style={{ transform: 'translateY(-50%)' }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all duration-200 ${displayValue === i
                                        ? 'bg-white scale-150 shadow-lg'
                                        : 'bg-white/40 scale-100'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Mood Labels */}
                <div className="flex justify-between text-sm px-1">
                    {[
                        { emoji: '😞', label: 'Muy mal' },
                        { emoji: '😕', label: 'Mal' },
                        { emoji: '😐', label: 'Regular' },
                        { emoji: '🙂', label: 'Bien' },
                        { emoji: '😊', label: 'Muy bien' }
                    ].map((mood, i) => (
                        <div
                            key={i}
                            className={`flex flex-col items-center transition-all duration-200 ${displayValue === i + 1 ? 'scale-110 opacity-100' : 'scale-90 opacity-50'
                                }`}
                        >
                            <span className="text-2xl">{mood.emoji}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Confirm Button */}
            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-white text-[#475569] font-bold py-4 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 shadow-lg border-2 border-gray-200 hover:scale-105 active:scale-95"
            >
                {loading ? '⏳ Guardando...' : '✅ Confirmar mi Estado de Ánimo'}
            </button>

            <style jsx>{`
                @keyframes bounce-scale {
                    0%, 100% { transform: scale(1) rotate(0deg); }
                    25% { transform: scale(1.2) rotate(-8deg); }
                    50% { transform: scale(0.9) rotate(8deg); }
                    75% { transform: scale(1.15) rotate(-5deg); }
                }
                
                .animate-bounce-scale {
                    animation: bounce-scale 0.5s ease-in-out;
                }
                
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: white;
                    cursor: grab;
                    border: 4px solid #475569;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    transition: all 0.2s ease;
                }
                .slider::-webkit-slider-thumb:hover {
                    transform: scale(1.3);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                }
                .slider::-webkit-slider-thumb:active {
                    cursor: grabbing;
                    transform: scale(1.5);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                }
                .slider::-moz-range-thumb {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: white;
                    cursor: grab;
                    border: 4px solid #475569;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    transition: all 0.2s ease;
                }
                .slider::-moz-range-thumb:hover {
                    transform: scale(1.3);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                }
                .slider::-moz-range-thumb:active {
                    cursor: grabbing;
                    transform: scale(1.5);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    )
}
