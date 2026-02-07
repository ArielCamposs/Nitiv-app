'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { completeMission } from './actions'
import clsx from 'clsx'

export default function MissionItem({ mission, isCompleted }: { mission: any, isCompleted: boolean }) {
    const [loading, setLoading] = useState(false)

    const handleComplete = async () => {
        if (isCompleted || loading) return
        setLoading(true)
        await completeMission(mission.id)
        setLoading(false)
    }

    return (
        <div className={clsx(
            "p-4 rounded-xl shadow-sm border transition-all flex items-center justify-between",
            isCompleted ? "bg-[#E9EDC9] border-[#CCD5AE]" : "bg-white border-gray-100"
        )}>
            <div>
                <h3 className={clsx("font-bold text-[#475569]", isCompleted && "line-through opacity-70")}>
                    {mission.title}
                </h3>
                <p className="text-sm text-gray-500">{mission.description}</p>
                <span className="text-xs font-bold text-orange-400 mt-1 block">
                    +{mission.points_reward} pts
                </span>
            </div>

            <button
                onClick={handleComplete}
                disabled={isCompleted || loading}
                className={clsx(
                    "p-2 rounded-full transition-colors",
                    isCompleted ? "text-green-600" : "text-gray-300 hover:text-[#CCD5AE]"
                )}
            >
                {isCompleted ? (
                    <CheckCircle2 size={32} />
                ) : loading ? (
                    <Loader2 size={32} className="animate-spin" />
                ) : (
                    <Circle size={32} />
                )}
            </button>
        </div>
    )
}
