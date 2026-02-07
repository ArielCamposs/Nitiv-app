'use client'

import { Calendar, FileText, Eye } from 'lucide-react'
import clsx from 'clsx'

interface CaseRowProps {
    caseData: {
        id: string
        student_name: string
        student_id: string
        summary: string
        status: string
        priority?: 'high' | 'medium' | 'low'
        last_session?: string
    }
}

export default function CaseRow({ caseData }: CaseRowProps) {
    const priorityConfig = {
        high: { bg: 'bg-red-100', text: 'text-red-700', label: 'Alta' },
        medium: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Media' },
        low: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Baja' }
    }

    const priority = caseData.priority || 'low'
    const config = priorityConfig[priority]

    return (
        <tr className="hover:bg-gray-50 transition-colors group">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                        {caseData.student_name?.charAt(0) || 'E'}
                    </div>
                    <div>
                        <p className="font-bold text-[#475569]">{caseData.student_name}</p>
                        <p className="text-xs text-gray-400">ID: {caseData.student_id?.slice(0, 8)}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    config.bg, config.text
                )}>
                    {config.label}
                </span>
            </td>
            <td className="px-6 py-4 max-w-xs">
                <p className="text-sm text-gray-600 truncate">{caseData.summary || 'Sin resumen'}</p>
            </td>
            <td className="px-6 py-4">
                <p className="text-xs text-gray-400">{caseData.last_session || 'Sin sesiones'}</p>
            </td>
            <td className="px-6 py-4">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="Ver Detalles">
                        <Eye size={16} />
                    </button>
                    <button className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors" title="Agendar">
                        <Calendar size={16} />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors" title="Agregar Nota">
                        <FileText size={16} />
                    </button>
                </div>
            </td>
        </tr>
    )
}
