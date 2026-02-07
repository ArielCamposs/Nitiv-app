import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
    title: string
    value: number | string
    icon: LucideIcon
    gradient: string
    iconColor: string
}

export default function StatsCard({ title, value, icon: Icon, gradient, iconColor }: StatsCardProps) {
    return (
        <div className={`${gradient} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 opacity-10">
                <Icon size={120} />
            </div>
            <div className="relative z-10">
                <div className={`${iconColor} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                    <Icon size={24} />
                </div>
                <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
            </div>
        </div>
    )
}
