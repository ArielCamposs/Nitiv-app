"use client"

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
} from "lucide-react"

type NavItem = {
    title: string
    href: string
    icon: React.ElementType
    badge?: boolean
    chatBadge?: boolean
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
            { title: "Inicio", href: "/admin", icon: LayoutDashboard },
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
export function AdminSidebarContent({ userId, showBell = true, institutionName }: { userId: string; showBell?: boolean; institutionName?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const { totalUnread } = useChatUnread()

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
                        <img src="/logo.svg" alt="Nitiv Logo" className="h-28 w-auto object-contain object-left" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 -mt-2 ml-1">
                            Admin
                        </span>
                    </div>
                    {showBell && <span className="shrink-0 mt-0.5"><NotificationBell userId={userId} /></span>}
                </div>
                {institutionName && (
                    <p className="text-sm font-medium text-slate-700 truncate border-l-2 border-slate-300 pl-2.5" title={institutionName}>
                        {institutionName}
                    </p>
                )}
            </div>

            {/* Nav agrupado */}
            <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
                {ADMIN_GROUPS.map((group) => (
                    <div key={group.label}>
                        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900",
                                        pathname === item.href ||
                                            (pathname.startsWith(item.href + "/") && item.href !== "/")
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-500"
                                    )}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span className="flex-1">{item.title}</span>
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
                ))}
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
export function AdminSidebar({ userId, institutionName }: { userId: string; institutionName?: string }) {
    return (
        <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-slate-50/50 p-6 md:flex md:flex-col">
            <AdminSidebarContent userId={userId} institutionName={institutionName} />
        </aside>
    )
}
