'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface WeeklyData {
    week: string
    avgWellbeing: number
}

export default function WeeklyEvolutionChart({ data }: { data: WeeklyData[] }) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="avgWellbeing"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Bienestar Promedio"
                    dot={{ fill: '#10B981', r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
