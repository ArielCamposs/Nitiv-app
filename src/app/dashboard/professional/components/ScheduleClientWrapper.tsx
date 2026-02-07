'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import CreateAppointmentModal from '../components/CreateAppointmentModal'

interface ScheduleClientWrapperProps {
    students: Array<{ id: string; full_name: string }>
}

export default function ScheduleClientWrapper({ students }: ScheduleClientWrapperProps) {
    const [showModal, setShowModal] = useState(false)

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
                <Plus size={20} />
                Nueva Sesión
            </button>

            <CreateAppointmentModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                students={students}
            />
        </>
    )
}
