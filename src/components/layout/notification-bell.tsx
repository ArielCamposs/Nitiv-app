"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Bell, CheckCheck, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { NotificationShareDialog } from "@/components/chat/notification-share-dialog"

// ── Tipos ────────────────────────────────────────────────────────────────────
type Notification = {
    id: string
    type: string
    title: string
    message: string
    related_url: string | null
    read: boolean
    created_at: string
}

// ── Icono por tipo ────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { emoji: string; color: string }> = {
    dec_nuevo: { emoji: "🚨", color: "bg-rose-50   border-rose-100" },
    dec_resuelto: { emoji: "✅", color: "bg-emerald-50 border-emerald-100" },
    actividad_nueva: { emoji: "📅", color: "bg-indigo-50  border-indigo-100" },
    pulso_activo: { emoji: "⚡", color: "bg-violet-50  border-violet-100" },
    estudiante_nuevo: { emoji: "👋", color: "bg-green-50   border-green-100" },
    usuario_nuevo: { emoji: "👤", color: "bg-blue-50    border-blue-100" },
    actividad_evaluada: { emoji: "⭐", color: "bg-yellow-50 border-yellow-100" },
}

// ── Componente ────────────────────────────────────────────────────────────────
export function NotificationBell({ userId }: { userId: string }) {
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [shareNotif, setShareNotif] = useState<Notification | null>(null)
    const [institutionId, setInstitutionId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    const pathname = usePathname()

    const unreadCount = notifications.filter(n => !n.read).length

    // ── Cargar institution_id y rol una sola vez ──────────────────────────────
    useEffect(() => {
        supabase
            .from("users")
            .select("institution_id, role")
            .eq("id", userId)
            .single()
            .then(({ data }) => {
                if (data) {
                    setInstitutionId(data.institution_id)
                    setUserRole(data.role)
                }
            })
    }, [userId])

    // ── Fetch inicial ─────────────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        const res = await fetch("/api/notifications")
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchNotifications() }, [fetchNotifications])

    // ── Realtime: nuevas notificaciones sin recargar ───────────────────────────
    useEffect(() => {
        if (!userId) return
        const channel = supabase
            .channel(`bell-notifs-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `recipient_id=eq.${userId}`,
                },
                () => fetchNotifications()
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [userId, fetchNotifications])

    // ── Auto-leer al navegar a secciones relacionadas ─────────────────────────
    useEffect(() => {
        if (loading) return

        // Mapa: segmento de ruta → tipos que se marcan al visitar esa sección
        const ROUTE_TYPE_MAP: Array<{ segment: string; types: string[] }> = [
            { segment: "/dec", types: ["dec_nuevo", "dec_resuelto"] },
            { segment: "/actividades", types: ["actividad_nueva", "actividad_evaluada"] },
            { segment: "/pulso", types: ["pulso_activo"] },
            { segment: "/estudiantes", types: ["estudiante_nuevo"] },
            { segment: "/usuarios", types: ["usuario_nuevo"] },
        ]

        const matchedTypes = ROUTE_TYPE_MAP
            .filter(({ segment }) => pathname.includes(segment))
            .flatMap(({ types }) => types)

        if (matchedTypes.length === 0) return

        const unread = notifications.filter(
            n => !n.read && matchedTypes.includes(n.type)
        )
        if (unread.length === 0) return

        setNotifications(prev =>
            prev.map(n => unread.some(u => u.id === n.id) ? { ...n, read: true } : n)
        )
        fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ types: matchedTypes }),
        })
    }, [pathname, loading])

    // ── Realtime: escucha nuevas notificaciones ───────────────────────────────
    useEffect(() => {
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `recipient_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification
                    setNotifications(prev => [newNotif, ...prev])
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId])

    // ── Cerrar al hacer clic fuera ────────────────────────────────────────────
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [open])

    // ── Marcar una como leída ─────────────────────────────────────────────────
    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [id] }),
        })
    }

    // ── Marcar todas como leídas ──────────────────────────────────────────────
    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true }),
        })
    }

    const handleClick = (n: Notification) => {
        if (!n.read) markAsRead(n.id)
        if (n.related_url) window.location.href = n.related_url
        setOpen(false)
    }

    return (
        <div className="relative" ref={panelRef}>
            {/* Botón campana */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel desplegable */}
            {open && (
                <div className="fixed top-16 right-4 md:top-4 md:left-64 md:right-auto w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[200] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">
                                    {unreadCount} nuevas
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Marcar todas como leídas"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Lista */}
                    <div className="max-h-[360px] overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-sm text-slate-400">Cargando...</div>
                        ) : notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell className="w-7 h-7 mx-auto mb-2 text-slate-200" />
                                <p className="text-sm text-slate-400">Sin notificaciones</p>
                            </div>
                        ) : (
                            <ul>
                                {notifications.map(n => {
                                    const meta = TYPE_META[n.type] ?? { emoji: "🔔", color: "bg-slate-50 border-slate-100" }
                                    return (
                                        <li key={n.id} className="relative group border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                            <div className="flex gap-3 items-start px-4 py-3">
                                                {/* Botón principal un click en Notificación */}
                                                <button
                                                    onClick={() => handleClick(n)}
                                                    className="flex-1 text-left flex gap-3 items-start outline-none"
                                                >
                                                    {/* Emoji */}
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg border flex items-center justify-center text-base shrink-0",
                                                        meta.color
                                                    )}>
                                                        {meta.emoji}
                                                    </div>

                                                    {/* Contenido */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn(
                                                            "text-sm leading-snug",
                                                            n.read ? "text-slate-600 font-normal" : "text-slate-900 font-medium"
                                                        )}>
                                                            {n.title}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                                            {n.message}
                                                        </p>
                                                        <p className="text-[10px] text-slate-300 mt-1">
                                                            {formatDistanceToNow(new Date(n.created_at), {
                                                                addSuffix: true,
                                                                locale: es,
                                                            })}
                                                        </p>
                                                    </div>

                                                    {/* Punto azul si no leída */}
                                                    {!n.read && (
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                                                    )}
                                                </button>

                                                {userRole !== "estudiante" && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setShareNotif(n)
                                                        }}
                                                        className={cn(
                                                            "text-[11px] text-primary hover:underline font-medium px-2 py-1 bg-primary/5 rounded absolute right-4 top-1/2 -translate-y-1/2 shadow-sm transition-opacity",
                                                            "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                        )}
                                                    >
                                                        Enviar al chat
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {shareNotif && institutionId && (
                <NotificationShareDialog
                    open={shareNotif !== null}
                    onOpenChange={(v) => { if (!v) setShareNotif(null) }}
                    currentUserId={userId}
                    institutionId={institutionId}
                    notification={{
                        id: shareNotif.id,
                        type: shareNotif.type,
                        title: shareNotif.title,
                        message: shareNotif.message,
                        related_id: null,
                        related_url: shareNotif.related_url
                    }}
                    onShared={() => {
                        setShareNotif(null)
                        setOpen(false)
                    }}
                />
            )}
        </div>
    )
}
