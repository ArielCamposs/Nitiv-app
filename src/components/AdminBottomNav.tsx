'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, BookOpen, AlertTriangle, FileText, Calendar, TrendingUp, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
    {
        href: '/dashboard/admin',
        icon: Home,
        label: 'Inicio',
        color: 'from-red-400 to-red-600',
        activeColor: 'text-red-600'
    },
    {
        href: '/dashboard/admin/users',
        icon: Users,
        label: 'Usuarios',
        color: 'from-blue-400 to-blue-600',
        activeColor: 'text-blue-600'
    },
    {
        href: '/dashboard/admin/courses',
        icon: BookOpen,
        label: 'Cursos',
        color: 'from-green-400 to-green-600',
        activeColor: 'text-green-600'
    },
    {
        href: '/dashboard/admin/alerts',
        icon: AlertTriangle,
        label: 'Alertas',
        color: 'from-orange-400 to-orange-600',
        activeColor: 'text-orange-600'
    },
    {
        href: '/dashboard/admin/reports',
        icon: FileText,
        label: 'Reportes',
        color: 'from-purple-400 to-purple-600',
        activeColor: 'text-purple-600'
    },
    {
        href: '/dashboard/admin/activities',
        icon: Calendar,
        label: 'Actividades',
        color: 'from-teal-400 to-teal-600',
        activeColor: 'text-teal-600'
    },
    {
        href: '/dashboard/admin/statistics',
        icon: TrendingUp,
        label: 'Estadísticas',
        color: 'from-amber-400 to-amber-600',
        activeColor: 'text-amber-600'
    },
]

export default function AdminBottomNav() {
    const pathname = usePathname()
    const router = useRouter()
    const [userProfile, setUserProfile] = useState<{ full_name: string; email: string } | null>(null)

    useEffect(() => {
        async function loadUserProfile() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()

                setUserProfile({
                    full_name: profile?.full_name || 'Administrador',
                    email: user.email || ''
                })
            }
        }
        loadUserProfile()
    }, [])

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
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 md:hidden">
                <div className="flex justify-around items-center h-20 px-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard/admin' && pathname?.startsWith(item.href))

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex flex-col items-center justify-center gap-1 flex-1 py-2
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
                                    text-xs font-bold transition-colors text-center
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
                        className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200 opacity-70 hover:opacity-100"
                    >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-100 hover:bg-gradient-to-br hover:from-red-400 hover:to-red-600 transition-all duration-200">
                            <LogOut size={24} className="text-red-600 hover:text-white transition-colors" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold text-red-600">Salir</span>
                    </button>
                </div>
            </nav>

            {/* Desktop Navigation - Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r-2 border-gray-200 shadow-xl z-40 flex-col py-6">
                {/* User Profile Area */}
                <div className="px-6 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-lg">
                            {userProfile?.full_name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[#475569] truncate">
                                {userProfile?.full_name || 'Cargando...'}
                            </h3>
                            <p className="text-xs text-gray-400 truncate">
                                {userProfile?.email || ''}
                            </p>
                        </div>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                </div>

                {/* Navigation Items */}
                <nav className="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden px-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard/admin' && pathname?.startsWith(item.href))

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl
                                    transition-all duration-200
                                    ${isActive
                                        ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }
                                `}
                                title={item.label}
                            >
                                <Icon
                                    size={20}
                                    className={isActive ? 'text-white' : 'text-gray-500'}
                                    strokeWidth={2}
                                />
                                <span className={`
                                    text-sm font-semibold
                                    ${isActive ? 'text-white' : 'text-gray-700'}
                                `}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout Button */}
                <div className="px-3 pt-4 border-t border-gray-200 mt-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-red-600 hover:bg-red-50 transition-all duration-200"
                        title="Cerrar sesión"
                    >
                        <LogOut size={20} strokeWidth={2} />
                        <span className="text-sm font-semibold">Cerrar sesión</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
