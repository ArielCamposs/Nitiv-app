"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
    Home, LogOut, ShoppingBag, ThermometerSun, Users, LifeBuoy,
    Shield, BarChart3, FileText, MessageSquare, Activity, UserCircle,
    Calendar, BookOpen, Library, ClipboardList, Radar, Lock,
    ChevronDown
} from "lucide-react"
import { useChatUnread } from "@/context/chat-unread-context"
import { DecBadge } from "@/components/dashboard/dec-badge"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { NotificationBell } from "@/components/layout/notification-bell"

// ─── Tipos ─────────────
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

// ─── Función principal de grupos ──────────────────────────────────────────────
function getSidebarGroups(currentRole: string | null): NavGroup[] {
    if (!currentRole) return []

    // Resuelve el href del dashboard según rol
    const homeHref: Record<string, string> = {
        docente: "/docente",
        estudiante: "/estudiante",
        centro_alumnos: "/estudiante",
        dupla: "/dupla",
        convivencia: "/convivencia",
        admin: "/admin",
        director: "/director",
        inspector: "/inspector",
        utp: "/utp",
    }
    const dashHref = homeHref[currentRole] ?? "/"

    const isStudent = currentRole === "estudiante" || currentRole === "centro_alumnos"
    const isDocente = currentRole === "docente"
    const isGestion = ["dupla", "convivencia", "director", "admin", "inspector", "utp"].includes(currentRole)
    const hasDeepAccess = ["dupla", "convivencia", "director", "admin"].includes(currentRole)

    // ── Bloque 1: Centro de Acción ─────────────────────────────────────────────
    const centroAccion: NavItem[] = [
        { title: "Inicio", href: dashHref, icon: Home, exactMatch: true },
    ]

    if (isStudent) {
        centroAccion.push({ title: "Check-in", href: "/estudiante/checkin", icon: Activity })
        centroAccion.push({ title: "Radar de Competencias", href: "/estudiante/radar", icon: Radar })
    }

    if (isDocente) {
        centroAccion.push({ title: "Clima de aula", href: "/docente/clima", icon: ThermometerSun })
    }

    // ── Bloque 2: Gestión de Casos ─────────────────────────────────────────────
    const gestionCasos: NavItem[] = []

    if (isDocente) {
        gestionCasos.push({ title: "Cursos", href: "/docente/estudiantes", icon: Users })
    }

    if (isGestion || isDocente) {
        // Resuelve la ruta de DEC según rol
        const decHref =
            currentRole === "dupla" || currentRole === "director"
                ? "/dupla/dec"
                : currentRole === "convivencia"
                    ? "/convivencia/dec"
                    : "/dec"

        gestionCasos.push({ title: "Registro DEC", href: decHref, icon: Shield, badge: true })
        gestionCasos.push({ title: "PAEC", href: "/paec", icon: LifeBuoy })
        gestionCasos.push({ title: "Reg. Convivencia", href: "/registros-convivencia", icon: ClipboardList })
    }

    if (hasDeepAccess) {
        gestionCasos.push({
            title: "Clima de aula",
            href: `/${currentRole}/heatmap`,
            icon: Activity,
        })
        gestionCasos.push({ title: "Cursos", href: `/${currentRole}/estudiantes`, icon: Users })
    }

    // Radar de Competencias — solo dupla y convivencia
    if (currentRole === "dupla" || currentRole === "convivencia") {
        gestionCasos.push({ title: "Radar de Competencias", href: `/${currentRole}/radar`, icon: Radar })
    }


    // ── Bloque 3: Biblioteca y Comunidad ──────────────────────────────────────
    const biblioteca: NavItem[] = []

    biblioteca.push({ title: "Actividades", href: isStudent ? "/estudiante/actividades" : "/actividades", icon: Calendar })
    biblioteca.push({ title: "Recursos", href: "/recursos", icon: BookOpen })
    biblioteca.push({ title: "Biblioteca Nitiv", href: isStudent ? "/estudiante/biblioteca" : "/biblioteca", icon: Library })

    if (isStudent) {
        biblioteca.push({ title: "Tienda", href: "/estudiante/tienda", icon: ShoppingBag })
    }

    if (!isStudent) {
        biblioteca.push({ title: "Chat", href: "/chat", icon: MessageSquare, chatBadge: true })
    }

    // ── Bloque 4: Análisis ────────────────────────────────────────────────────
    const analisis: NavItem[] = []

    if (hasDeepAccess || currentRole === "utp") {
        analisis.push({ title: "Estadísticas", href: "/estadisticas", icon: BarChart3 })
    }

    if (!isStudent) {
        analisis.push({ title: "Reportes", href: "/reportes", icon: FileText })
    }

    // ── Armar grupos (omitir si está vacío) ───────────────────────────────────
    const groups: NavGroup[] = [
        { label: "Centro de Acción", items: centroAccion },
        ...(gestionCasos.length > 0 ? [{ label: "Gestión de Casos", items: gestionCasos }] : []),
        { label: "Biblioteca y Comunidad", items: biblioteca },
        ...(analisis.length > 0 ? [{ label: "Análisis", items: analisis }] : []),
    ]

    return groups
}

function AvatarContent({ fullName, role, studentCourseLabel }: { fullName: string; role: string | null; studentCourseLabel?: string | null }) {
    const roleLabel =
        role === "docente" ? "Docente"
            : role === "dupla" ? "Dupla Psicosocial"
                : role === "convivencia" ? "Encargado de Convivencia"
                    : role === "director" ? "Director"
                        : role === "admin" ? "Administrador"
                            : role === "inspector" ? "Inspector"
                                : role === "utp" ? "UTP"
                                    : role === "estudiante"
                                        ? (studentCourseLabel ? `Estudiante · ${studentCourseLabel}` : "Estudiante")
                                        : role === "centro_alumnos"
                                            ? (studentCourseLabel ? `Centro de Alumnos · ${studentCourseLabel}` : "Centro de Alumnos")
                                            : role ?? ""

    return (
        <>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                    {fullName
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                </span>
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                    {fullName}
                </p>
                <p className="text-xs text-slate-400 truncate" title={roleLabel}>
                    {roleLabel}
                </p>
            </div>
        </>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function SidebarContent({ userId, showBell = true, institutionName, institutionLogoUrl, isMobileMenuOpen, initialRole, initialFullName, studentCourseLabel: initialStudentCourseLabel }: { userId: string; showBell?: boolean; institutionName?: string; institutionLogoUrl?: string; isMobileMenuOpen?: boolean; initialRole?: string; initialFullName?: string; studentCourseLabel?: string | null }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [role, setRole] = useState<string | null>(initialRole ?? null)
    const [fullName, setFullName] = useState<string | null>(initialFullName ?? null)
    const [studentCourseLabel, setStudentCourseLabel] = useState<string | null>(initialStudentCourseLabel ?? null)
    const [loading, setLoading] = useState(!(initialRole && initialFullName))
    const [radarActive, setRadarActive] = useState<boolean | null>(null)
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
    const { totalUnread } = useChatUnread()

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => ({ ...prev, [label]: !(prev[label] ?? false) }))
    }

    const sidebarGroups = getSidebarGroups(role)
    const isStudent = role === "estudiante" || role === "centro_alumnos"

    // Al cambiar ruta o al abrir el menú móvil: dejar abierta solo la sección que contiene la página actual
    useEffect(() => {
        if (!role || role === "estudiante" || role === "centro_alumnos") return
        const groups = getSidebarGroups(role)
        if (groups.length === 0) return
        const next: Record<string, boolean> = {}
        for (const g of groups) {
            const hasActive = g.items.some(item => item.exactMatch ? pathname === item.href : (pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/")))
            next[g.label] = hasActive
        }
        setOpenGroups(next)
    }, [pathname, role, isMobileMenuOpen])

    useEffect(() => {
        const getRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data: profile } = await supabase
                    .from("users")
                    .select("role, name, last_name")
                    .eq("id", user.id)
                    .single()
                if (profile) {
                    setRole(profile.role)
                    setFullName([profile.name, profile.last_name].filter(Boolean).join(" "))

                    // Si es estudiante, obtener curso y verificar si tiene radar activo
                    if (profile.role === "estudiante" || profile.role === "centro_alumnos") {
                        const { data: student } = await supabase
                            .from("students")
                            .select("course_id, institution_id")
                            .eq("user_id", user.id)
                            .maybeSingle()

                        if (student?.course_id) {
                            const { data: course } = await supabase
                                .from("courses")
                                .select("name, section")
                                .eq("id", student.course_id)
                                .maybeSingle()
                            if (course) {
                                setStudentCourseLabel([course.name, course.section].filter(Boolean).join(" ").trim() || null)
                            }
                            const { data: sessions } = await supabase
                                .from("radar_sessions")
                                .select("id")
                                .eq("institution_id", student.institution_id)
                                .eq("course_id", student.course_id)
                                .eq("active", true)
                                .limit(1)
                            setRadarActive((sessions?.length ?? 0) > 0)
                        } else {
                            setRadarActive(false)
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching role:", error)
            } finally {
                setLoading(false)
            }
        }
        getRole()
    }, [])

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) { toast.error("Error al cerrar sesión"); return }
        router.push("/login")
        router.refresh()
    }

    if (loading && !role) {
        return (
            <div className="flex h-full flex-col p-6 border-r bg-slate-50/50">
                <div className="mb-8 flex items-center gap-2 px-2">
                    <span className="text-xl font-bold text-slate-300">Cargando...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            {/* Logo + nombre del colegio + campana */}
            <div className="mb-1 flex flex-col gap-0.5 px-0">
                <div className="flex items-start justify-between gap-1">
                    <img src="/3%20ft.svg" alt="Nitiv Logo" className="h-28 w-auto max-w-[88%] object-contain object-left -ml-1 shrink-0" />
                    {showBell && <span className="shrink-0 mt-0.5"><NotificationBell userId={userId} /></span>}
                </div>
                {institutionName && (
                    <div className="flex items-center gap-2 px-1 border-l-2 border-slate-300 pl-2.5 min-w-0">
                        {institutionLogoUrl && (
                            <img src={institutionLogoUrl} alt="" className="h-6 w-6 shrink-0 rounded object-contain bg-white border border-slate-100" />
                        )}
                        <p className="text-sm font-medium text-slate-700 truncate min-w-0" title={institutionName}>
                            {institutionName}
                        </p>
                    </div>
                )}
            </div>

            {/* Nav agrupado: desplegable para no estudiantes, fijo para estudiantes */}
            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                {sidebarGroups.map((group) => {
                    const isOpen = isStudent ? true : (openGroups[group.label] ?? false)

                    const renderItems = () => (
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isRadarLink = item.href === "/estudiante/radar"
                                const isRadarLocked = isRadarLink && radarActive !== true

                                if (isRadarLocked) {
                                    return (
                                        <span
                                            key={item.href}
                                            title="No disponible — tu curso aún no tiene el Radar activado"
                                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 cursor-not-allowed select-none"
                                        >
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            <span className="flex-1">{item.title}</span>
                                            <Lock className="h-3 w-3 shrink-0" />
                                        </span>
                                    )
                                }

                                const isActive = item.exactMatch
                                    ? pathname === item.href
                                    : (pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/"))
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4 shrink-0" />
                                        <span className="flex-1">{item.title}</span>
                                        {/* @ts-ignore */}
                                        {item.badge && <DecBadge />}
                                        {/* @ts-ignore */}
                                        {item.chatBadge && totalUnread > 0 && (
                                            <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                                {totalUnread > 9 ? "9+" : totalUnread}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    )

                    if (isStudent) {
                        return (
                            <div key={group.label} className="pt-4 first:pt-0">
                                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                    {group.label}
                                </p>
                                {renderItems()}
                            </div>
                        )
                    }

                    return (
                        <div key={group.label} className="border-b border-slate-200/60 last:border-b-0 pb-2 last:pb-0">
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.label)}
                                className={cn(
                                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors",
                                    isOpen
                                        ? "bg-indigo-200/80 text-indigo-800 hover:bg-indigo-300/80"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                )}
                            >
                                <span>{group.label}</span>
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
                                    <div className="mt-0.5">{renderItems()}</div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </nav>

            {/* Zona inferior: nombre + rol + emergencia + logout */}
            <div className="border-t pt-4 space-y-1">

                {/* Avatar con iniciales + nombre + rol */}
                {fullName && (
                    <div className="px-3 py-2 mb-2">
                        {isStudent ? (
                            <Link href="/estudiante/configuracion" className="flex items-center gap-3 hover:bg-slate-100 p-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                                <AvatarContent fullName={fullName} role={role} studentCourseLabel={studentCourseLabel} />
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3 p-2 -mx-2">
                                <AvatarContent fullName={fullName} role={role} studentCourseLabel={studentCourseLabel} />
                            </div>
                        )}
                    </div>
                )}

                {(role === "estudiante" || role === "centro_alumnos") && (
                    <Link
                        href="/estudiante/ayuda"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                        <LifeBuoy className="h-4 w-4" />
                        <span>Necesito ayuda</span>
                    </Link>
                )}
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

export function Sidebar({ userId, institutionName, institutionLogoUrl, initialRole, initialFullName, studentCourseLabel }: { userId: string; institutionName?: string; institutionLogoUrl?: string; initialRole?: string; initialFullName?: string; studentCourseLabel?: string }) {
    return (
        <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-slate-50/50 p-6 md:flex md:flex-col">
            <SidebarContent userId={userId} institutionName={institutionName} institutionLogoUrl={institutionLogoUrl} initialRole={initialRole} initialFullName={initialFullName} studentCourseLabel={studentCourseLabel} />
        </aside>
    )
}
