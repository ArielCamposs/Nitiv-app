'use client'

import { LogOut, User } from 'lucide-react'
import { useState } from 'react'

interface UserMenuProps {
    userName: string
    userRole: string
    onLogout: () => void
}

export default function UserMenu({ userName, userRole, onLogout }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {userName?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                    <p className="font-bold text-sm text-gray-700">{userName || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 capitalize">{userRole || 'Rol'}</p>
                </div>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                        <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700">
                            <User size={16} />
                            <span className="text-sm">Mi Perfil</span>
                        </button>
                        <hr className="my-2 border-gray-100" />
                        <button
                            onClick={onLogout}
                            className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 text-red-600 font-medium"
                        >
                            <LogOut size={16} />
                            <span className="text-sm">Cerrar Sesión</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
