"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useChatUnread } from "@/context/chat-unread-context"
import { DecBadge } from "@/components/dashboard/dec-badge"
import { NotificationBell } from "@/components/layout/notification-bell"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
    LayoutDashboard, UserCog, GraduationCap, School,
    ClipboardList, BarChart3,
    FileText, Calendar, BookOpen, MessageSquare,
    Building2, LogOut,
    ChevronDown,
} from "lucide-react"

type NavItem = {
    title: string
    href: string
    icon: React.ElementType
    badge?: boolean
    chatBadge?: boolean
    /** Si es true, solo se marca activo cuando pathname coincide exactamente (ej. Inicio) */
    exactMatch?: boolean
}

type NavGroup = {
    label: string
    items: NavItem[]
}

// ─── Grupos únicos del admin ──────────────────────────────────────────────────
const ADMIN_GROUPS: NavGroup[] = [
    {
        label: "Panel de Control",
        items: [
            { title: "Inicio", href: "/admin", icon: LayoutDashboard, exactMatch: true },
        ],
    },
    {
        label: "Gestión de Personas",
        items: [
            { title: "Usuarios", href: "/admin/usuarios", icon: UserCog },
            { title: "Estudiantes", href: "/admin/estudiantes", icon: GraduationCap },
            { title: "Cursos", href: "/admin/cursos", icon: School },
        ],
    },
    {
        label: "Bienestar y Clima",
        items: [
            { title: "Estadísticas", href: "/estadisticas", icon: BarChart3 },
            { title: "Reportes", href: "/reportes", icon: FileText },
        ],
    },
    {
        label: "Contenido",
        items: [
            { title: "Actividades", href: "/actividades", icon: Calendar },
            { title: "Recursos", href: "/recursos", icon: BookOpen },
        ],
    },
    {
        label: "Comunicación",
        items: [
            { title: "Chat", href: "/chat", icon: MessageSquare, chatBadge: true },
        ],
    },
    {
        label: "Configuración",
        items: [
            { title: "Institución", href: "/admin/institucion", icon: Building2 },
            { title: "Auditoría", href: "/admin/auditoria", icon: ClipboardList },
        ],
    },
]

// ─── Contenido del sidebar ────────────────────────────────────────────────────
export function AdminSidebarContent({ userId, showBell = true, institutionName, institutionLogoUrl, isMobileMenuOpen }: { userId: string; showBell?: boolean; institutionName?: string; institutionLogoUrl?: string; isMobileMenuOpen?: boolean }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const { totalUnread } = useChatUnread()
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => ({ ...prev, [label]: !(prev[label] ?? false) }))
    }

    // Al cambiar ruta o al abrir el menú móvil: dejar abierta solo la sección que contiene la página actual
    useEffect(() => {
        const next: Record<string, boolean> = {}
        for (const g of ADMIN_GROUPS) {
            const hasActive = g.items.some(item => item.exactMatch ? pathname === item.href : (pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/")))
            next[g.label] = hasActive
        }
        setOpenGroups(next)
    }, [pathname, isMobileMenuOpen])

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) { toast.error("Error al cerrar sesión"); return }
        router.push("/login")
        router.refresh()
    }

    return (
        <div className="flex h-full flex-col">
            {/* Logo + nombre del colegio + campana */}
            <div className="mb-1 flex flex-col gap-0.5 px-0">
                <div className="flex items-start justify-between gap-1">
                    <div className="flex flex-col max-w-[88%] -ml-1 min-w-0">
                        <img src="/3%20ft.svg" alt="Nitiv Logo" className="h-28 w-auto object-contain object-left" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 -mt-2 ml-1">
                            Admin
                        </span>
                    </div>
                    {showBell && <span className="shrink-0 mt-0.5"><NotificationBell userId={userId} /></span>}
                </div>
                {institutionName && (
                    <div className="flex items-center gap-2 border-l-2 border-slate-300 pl-2.5 min-w-0">
                        {institutionLogoUrl && (
                            <img src={institutionLogoUrl} alt="" className="h-6 w-6 shrink-0 rounded object-contain bg-white border border-slate-100" />
                        )}
                        <p className="text-sm font-medium text-slate-700 truncate min-w-0" title={institutionName}>
                            {institutionName}
                        </p>
                    </div>
                )}
            </div>

            {/* Nav agrupado — secciones desplegables */}
            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                {ADMIN_GROUPS.map((group) => {
                    const isOpen = openGroups[group.label] ?? false
                    return (
                        <div key={group.label} className="border-b border-slate-200/60 last:border-b-0 pb-2 last:pb-0">
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.label)}
                                className={cn(
                                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                                    isOpen
                                        ? "bg-indigo-200/80 text-indigo-800 hover:bg-indigo-300/80"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                )}
                            >
                                <span className="min-w-0 flex-1 text-left leading-snug whitespace-nowrap">
                                    {group.label}
                                </span>
                                <ChevronDown
                                    className={cn(
                                        "h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-out",
                                        isOpen ? "rotate-0" : "-rotate-90"
                                    )}
                                />
                            </button>
                            <div
                                className={cn(
                                    "grid transition-[grid-template-rows] duration-300 ease-out",
                                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                )}
                            >
                                <div className="min-h-0 overflow-hidden">
                                    <div className="mt-0.5 space-y-0.5">
                                        {group.items.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                                (item.exactMatch ? pathname === item.href : (pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/")))
                                                    ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                            )}
                                        >
                                                <item.icon className="h-4 w-4 shrink-0" />
                                                <span className="min-w-0 flex-1 whitespace-nowrap">{item.title}</span>
                                                {item.badge && <DecBadge />}
                                                {item.chatBadge && totalUnread > 0 && (
                                                    <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                                        {totalUnread > 9 ? "9+" : totalUnread}
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="border-t pt-4">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                </Button>
            </div>
        </div>
    )
}

// ─── Wrapper aside desktop ────────────────────────────────────────────────────
export function AdminSidebar({ userId, institutionName, institutionLogoUrl }: { userId: string; institutionName?: string; institutionLogoUrl?: string }) {
    return (
        <aside className="fixed left-0 top-0 hidden h-screen w-80 border-r bg-slate-50/50 p-6 md:flex md:flex-col">
            <AdminSidebarContent userId={userId} institutionName={institutionName} institutionLogoUrl={institutionLogoUrl} />
        </aside>
    )
}
