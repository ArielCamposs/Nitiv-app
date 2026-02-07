'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Gamepad2, TrendingUp, ShoppingBag, User, LogOut } from 'lucide-react'

const NAV_ITEMS = [
    {
        href: '/dashboard/student',
        icon: Home,
        label: 'Inicio',
        color: 'from-blue-400 to-blue-600',
        activeColor: 'text-blue-600'
    },
    {
        href: '/dashboard/student/missions',
        icon: Gamepad2,
        label: 'Misiones',
        color: 'from-purple-400 to-purple-600',
        activeColor: 'text-purple-600'
    },
    {
        href: '/dashboard/student/bitacora',
        icon: TrendingUp,
        label: 'Progreso',
        color: 'from-green-400 to-green-600',
        activeColor: 'text-green-600'
    },
    {
        href: '/dashboard/student/shop',
        icon: ShoppingBag,
        label: 'Tienda',
        color: 'from-orange-400 to-orange-600',
        activeColor: 'text-orange-600'
    },
    {
        href: '/dashboard/student/profile',
        icon: User,
        label: 'Perfil',
        color: 'from-teal-400 to-teal-600',
        activeColor: 'text-teal-600'
    },
]

export default function StudentBottomNav() {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        const response = await fetch('/api/auth/logout', { method: 'POST' })
        if (response.ok) {
            router.push('/login')
            router.refresh()
        }
    }

    return (
        <>
            {/* Bottom Navigation - Mobile */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 md:hidden overflow-x-auto">
                <div className="flex items-center h-20 px-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard/student' && pathname?.startsWith(item.href))

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex flex-col items-center justify-center gap-1 flex-shrink-0 w-20 py-2
                                    transition-all duration-200
                                    ${isActive ? 'scale-110' : 'scale-100 opacity-70'}
                                `}
                            >
                                <div className={`
                                    w-12 h-12 rounded-2xl flex items-center justify-center
                                    transition-all duration-200
                                    ${isActive
                                        ? `bg-gradient-to-br ${item.color} shadow-lg`
                                        : 'bg-gray-100'
                                    }
                                `}>
                                    <Icon
                                        size={24}
                                        className={isActive ? 'text-white' : 'text-gray-400'}
                                        strokeWidth={2.5}
                                    />
                                </div>
                                <span className={`
                                    text-xs font-bold transition-colors
                                    ${isActive ? item.activeColor : 'text-gray-400'}
                                `}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="flex flex-col items-center justify-center gap-1 flex-shrink-0 w-20 py-2 transition-all duration-200 opacity-70 hover:opacity-100"
                    >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-100 hover:bg-gradient-to-br hover:from-red-400 hover:to-red-600 transition-all duration-200">
                            <LogOut size={24} className="text-red-600 hover:text-white transition-colors" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold text-red-600">Salir</span>
                    </button>
                </div>
            </nav>

            {/* Desktop Navigation - Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-28 bg-white border-r-2 border-gray-200 shadow-xl z-40 flex-col items-center py-6 gap-4">
                <div className="flex flex-col items-center gap-4 flex-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard/student' && pathname?.startsWith(item.href))

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex flex-col items-center justify-center gap-2 w-24 py-3 rounded-2xl
                                    transition-all duration-200
                                    ${isActive ? 'scale-110' : 'scale-100 opacity-70 hover:opacity-100'}
                                `}
                                title={item.label}
                            >
                                <div className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center
                                    transition-all duration-200
                                    ${isActive
                                        ? `bg-gradient-to-br ${item.color} shadow-lg`
                                        : 'bg-gray-100 hover:bg-gray-200'
                                    }
                                `}>
                                    <Icon
                                        size={24}
                                        className={isActive ? 'text-white' : 'text-gray-400'}
                                        strokeWidth={2.5}
                                    />
                                </div>
                                <span className={`
                                    text-xs font-bold transition-colors text-center
                                    ${isActive ? item.activeColor : 'text-gray-400'}
                                `}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>

                {/* Logout Button - Bottom of Sidebar */}
                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center justify-center gap-2 w-24 py-3 rounded-2xl transition-all duration-200 opacity-70 hover:opacity-100 mt-auto"
                    title="Cerrar sesión"
                >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-100 hover:bg-gradient-to-br hover:from-red-400 hover:to-red-600 transition-all duration-200">
                        <LogOut size={24} className="text-red-600 hover:text-white transition-colors" strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-bold text-red-600 text-center">Cerrar sesión</span>
                </button>
            </aside>
        </>
    )
}
