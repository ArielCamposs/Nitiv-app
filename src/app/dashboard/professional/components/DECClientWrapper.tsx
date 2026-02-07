'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import CreateDECModal from '../components/CreateDECModal'

interface DECClientWrapperProps {
    courses: Array<{ id: string; name: string; level: string }>
}

export default function DECClientWrapper({ courses }: DECClientWrapperProps) {
    const [showModal, setShowModal] = useState(false)

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
                <Plus size={20} />
                Nuevo Registro DEC
            </button>

            <CreateDECModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                courses={courses}
            />
        </>
    )
}
