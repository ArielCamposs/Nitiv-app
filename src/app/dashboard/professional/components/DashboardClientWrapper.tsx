'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import CreateCaseModal from '../components/CreateCaseModal'
import CreateReportModal from '../components/CreateReportModal'
import CreateAppointmentModal from '../components/CreateAppointmentModal'

interface ClientWrapperProps {
    students: Array<{ id: string; full_name: string }>
}

export default function DashboardClientWrapper({ students }: ClientWrapperProps) {
    const [showCaseModal, setShowCaseModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showAppointmentModal, setShowAppointmentModal] = useState(false)

    return (
        <>
            {/* Header Button */}
            <button
                onClick={() => setShowCaseModal(true)}
                className="bg-gradient-to-r from-[#475569] to-[#334155] text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
                <Plus size={20} />
                Nuevo Caso
            </button>

            {/* Modals */}
            <CreateCaseModal
                isOpen={showCaseModal}
                onClose={() => setShowCaseModal(false)}
                students={students}
            />
            <CreateReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                students={students}
            />
            <CreateAppointmentModal
                isOpen={showAppointmentModal}
                onClose={() => setShowAppointmentModal(false)}
                students={students}
            />
        </>
    )
}
