'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import CreateReportModal from '../components/CreateReportModal'

interface ReportsClientWrapperProps {
    students: Array<{ id: string; full_name: string }>
}

export default function ReportsClientWrapper({ students }: ReportsClientWrapperProps) {
    const [showModal, setShowModal] = useState(false)

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
                <Plus size={20} />
                Nuevo Reporte
            </button>

            <CreateReportModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                students={students}
            />
        </>
    )
}
