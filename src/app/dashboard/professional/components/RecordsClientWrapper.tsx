'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import CreateRecordModal from '../components/CreateRecordModal'

interface RecordsClientWrapperProps {
    courses: Array<{ id: string; name: string; level: string }>
}

export default function RecordsClientWrapper({ courses }: RecordsClientWrapperProps) {
    const [showModal, setShowModal] = useState(false)

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
                <Plus size={20} />
                Nuevo Registro
            </button>

            <CreateRecordModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                courses={courses}
            />
        </>
    )
}
