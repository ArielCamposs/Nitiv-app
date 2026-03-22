"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useChatUnread } from "@/context/chat-unread-context"
import { useChat } from "@/hooks/useChat"
import { MessageSquare, X, ArrowLeft, Send, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatTimeAgo } from "@/lib/time-utils"

const BLOCKED_ROLES = ["estudiante", "centro_alumnos"]

interface Contact {
    id: string
    name: string
    last_name: string | null
    role: string
    conversationId?: string
    availability?: string | null
    updated_at?: string | null
}

const ROLE_LABEL: Record<string, string> = {
    docente: "Docente",
    dupla: "Dupla Psicosocial",
    convivencia: "Convivencia",
    director: "Director",
    admin: "Administrador",
    inspector: "Inspector",
    utp: "UTP",
}

// ── Subcomponente: ventana de conversación ────────────────────────────────────
function ChatWindow({
    conversationId,
    currentUserId,
    contact,
    onBack,
}: {
    conversationId: string
    currentUserId: string
    contact: Contact
    onBack: () => void
}) {
    const { messages, loading, sendMessage } = useChat(conversationId)
    const [text, setText] = useState("")
    const bottomRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const { markAsRead } = useChatUnread()

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Auto-mark as read when viewing this conversation in floating chat
    useEffect(() => {
        if (messages.length > 0) {
            markAsRead(conversationId)
        }
    }, [messages])

    const handleSend = async () => {
        if (!text.trim()) return
        await sendMessage(text, currentUserId, contact.id)
        setText("")
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-white">
                <button
                    onClick={onBack}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <Link href={`/perfil/${contact.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity block">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                        {contact.name} {contact.last_name ?? ""}
                    </p>
                    <p className="text-[10px] text-slate-400">
                        {ROLE_LABEL[contact.role] ?? contact.role}
                    </p>
                </Link>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-8 bg-slate-200 rounded-xl animate-pulse"
                                style={{ width: `${50 + i * 15}%` }}
                            />
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                        <MessageSquare className="w-8 h-8 opacity-30" />
                        <p className="text-xs">Inicia la conversación</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.sender_id === currentUserId

                        if (msg.meta?.type === "notification") {
                            return (
                                <div
                                    key={msg.id}
                                    className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
                                            isOwn
                                                ? "bg-primary text-white rounded-br-sm"
                                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                                        )}
                                    >
                                        <p className={cn(
                                            "text-xs font-semibold",
                                            isOwn ? "text-white" : "text-slate-700"
                                        )}>
                                            {msg.meta.title}
                                        </p>
                                        <p className={cn(
                                            "text-xs mt-1",
                                            isOwn ? "text-white/90" : "text-slate-500"
                                        )}>
                                            {msg.meta.message}
                                        </p>
                                        {msg.meta?.related_url && (
                                            <button
                                                onClick={() => router.push(msg.meta!.related_url)}
                                                className={cn(
                                                    "mt-2 text-[11px] font-semibold hover:underline block w-full text-left",
                                                    isOwn ? "text-white underline" : "text-primary"
                                                )}
                                            >
                                                Ver detalle
                                            </button>
                                        )}
                                        <p className={cn(
                                            "text-[9px] mt-1 text-right",
                                            isOwn ? "text-white/60" : "text-slate-400"
                                        )}>
                                            {new Date(msg.created_at).toLocaleTimeString("es-CL", {
                                                hour: "2-digit", minute: "2-digit"
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div
                                key={msg.id}
                                className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                            >
                                <div
                                    className={cn(
                                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-snug",
                                        isOwn
                                            ? "bg-primary text-white rounded-br-sm"
                                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                                    )}
                                >
                                    {msg.content}
                                    <p className={cn(
                                        "text-[9px] mt-1",
                                        isOwn ? "text-white/60 text-right" : "text-slate-400"
                                    )}>
                                        {new Date(msg.created_at).toLocaleTimeString("es-CL", {
                                            hour: "2-digit", minute: "2-digit"
                                        })}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t bg-white flex gap-2 items-end">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all max-h-20"
                />
                <button
                    onClick={handleSend}
                    disabled={!text.trim()}
                    className="p-2 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

// ── Componente de Lista para tener contador de tiempo ──
function ContactListFloating({
    contacts,
    openConversation,
    unreadMap
}: {
    contacts: Contact[]
    openConversation: (c: Contact) => void
    unreadMap: Record<string, number>
}) {
    const [, setTick] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="p-2 space-y-0.5">
            {contacts.map((contact) => {
                const convId = contact.conversationId
                const unread = convId ? unreadMap[convId] ?? 0 : 0
                const hasUnread = unread > 0
                const dotColor = contact.availability === "disponible" ? "bg-green-500" :
                    contact.availability === "en_clase" ? "bg-blue-500" :
                        contact.availability === "en_reunion" ? "bg-yellow-500" :
                            contact.availability === "ausente" ? "bg-slate-400" : "bg-green-500"

                return (
                    <button
                        key={contact.id}
                        onClick={() => openConversation(contact)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                            hasUnread
                                ? "bg-primary/5 hover:bg-primary/10"
                                : "hover:bg-slate-50"
                        )}
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                                hasUnread ? "bg-primary text-white" : "bg-primary/10 text-primary"
                            )}>
                                <span className="text-xs font-bold">
                                    {contact.name[0]}
                                    {contact.last_name?.[0] ?? ""}
                                </span>
                            </div>
                            <span className={cn(
                                "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white transition-colors",
                                dotColor
                            )} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className={cn(
                                "text-sm truncate",
                                hasUnread ? "font-semibold text-slate-900" : "font-medium text-slate-800"
                            )}>
                                {contact.name} {contact.last_name ?? ""}
                            </p>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
                                <span>{ROLE_LABEL[contact.role] ?? contact.role}</span>
                                {contact.updated_at && (
                                    <>
                                        <span>•</span>
                                        <span>{formatTimeAgo(contact.updated_at)}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Badge de no leídos */}
                        {hasUnread && (
                            <span className="ml-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                {unread > 9 ? "9+" : unread}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function FloatingChat({ userId }: { userId: string }) {
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const [activeContact, setActiveContact] = useState<Contact | null>(null)
    const [activeConvId, setActiveConvId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)

    const { unreadMap, totalUnread, markAsRead } = useChatUnread()
    const [institutionId, setInstitutionId] = useState<string | null>(null)

    // Escuchar evento global para cerrar otros widgets
    useEffect(() => {
        const handleClose = (e: any) => {
            if (e.detail?.id !== 'floating-chat') {
                setOpen(false)
            }
        }
        window.addEventListener("nitiv:close-floating-widgets", handleClose)
        return () => window.removeEventListener("nitiv:close-floating-widgets", handleClose)
    }, [])

    const toggleOpen = () => {
        if (!open) {
            window.dispatchEvent(new CustomEvent("nitiv:close-floating-widgets", { detail: { id: 'floating-chat' } }))
            setOpen(true)
        } else {
            setOpen(false)
        }
    }

    // Cargar contactos al abrir por primera vez
    useEffect(() => {
        if (!open || contacts.length > 0) return

        async function load() {
            setLoading(true)
            const { data: profile } = await supabase
                .from("users")
                .select("role, institution_id")
                .eq("id", userId)
                .single()

            if (!profile || BLOCKED_ROLES.includes(profile.role)) {
                setLoading(false)
                return
            }

            setUserRole(profile.role)
            setInstitutionId(profile.institution_id)

            const { data: users } = await supabase
                .from("users")
                .select("id, name, last_name, role, created_at")
                .not("role", "in", `(${BLOCKED_ROLES.join(",")})`)
                .eq("institution_id", profile.institution_id)
                .neq("id", userId)
                .order("name")

            const { data: convs } = await supabase
                .from("conversations")
                .select("id, user_a, user_b")
                .or(`user_a.eq.${userId},user_b.eq.${userId}`)

            const userIds = (users ?? []).map(u => u.id)
            const { data: avail } = userIds.length > 0
                ? await supabase.from("user_availability").select("user_id, status, updated_at").in("user_id", userIds)
                : { data: [] }

            const availMap: Record<string, { status: string; updated_at: string | null }> = {}
            avail?.forEach(a => { availMap[a.user_id] = { status: a.status, updated_at: a.updated_at } })

            setContacts(
                (users ?? []).map((u) => {
                    const conv = convs?.find(
                        (c) =>
                            (c.user_a === userId && c.user_b === u.id) ||
                            (c.user_b === userId && c.user_a === u.id)
                    )
                    const a = availMap[u.id]
                    return { ...u, conversationId: conv?.id, availability: a?.status ?? null, updated_at: a?.updated_at || u.created_at }
                })
            )
            setLoading(false)
        }

        load()
    }, [open])

    // Realtime: disponibilidad en vivo
    useEffect(() => {
        if (!institutionId) return
        const channel = supabase
            .channel("float-chat-availability")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "user_availability" },
                (payload) => {
                    const d = payload.new as { user_id: string; status: string; updated_at: string | null } | null
                    if (!d?.user_id) return
                    setContacts(prev =>
                        prev.map(c => c.id === d.user_id ? { ...c, availability: d.status, updated_at: d.updated_at } : c)
                    )
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [institutionId])

    const openConversation = async (contact: Contact) => {
        if (contact.conversationId) {
            markAsRead(contact.conversationId)
            setActiveConvId(contact.conversationId)
            setActiveContact(contact)
            return
        }

        // Crear conversación si no existe
        const { data: newConv } = await supabase
            .from("conversations")
            .insert({ user_a: userId, user_b: contact.id })
            .select("id")
            .single()

        if (newConv) {
            setContacts((prev) =>
                prev.map((c) =>
                    c.id === contact.id ? { ...c, conversationId: newConv.id } : c
                )
            )
            setActiveConvId(newConv.id)
            setActiveContact({ ...contact, conversationId: newConv.id })
        }
    }

    const filteredContacts = search.trim()
        ? contacts.filter((c) =>
            `${c.name} ${c.last_name ?? ""}`
                .toLowerCase()
                .includes(search.toLowerCase())
        )
        : contacts

    const sortedContacts = [...filteredContacts].sort((a, b) => {
        const ua = a.conversationId ? unreadMap[a.conversationId] ?? 0 : 0
        const ub = b.conversationId ? unreadMap[b.conversationId] ?? 0 : 0
        return ub - ua
    })

    // No mostrar para estudiantes
    if (userRole && BLOCKED_ROLES.includes(userRole)) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Panel flotante */}
            {open && (
                <div className="w-80 h-[460px] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden">

                    {activeContact && activeConvId ? (
                        // Vista de conversación
                        <ChatWindow
                            conversationId={activeConvId}
                            currentUserId={userId}
                            contact={activeContact}
                            onBack={() => {
                                setActiveContact(null)
                                setActiveConvId(null)
                            }}
                        />
                    ) : (
                        // Vista de lista de contactos
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-semibold text-slate-800">
                                        Mensajes
                                    </span>
                                    {totalUnread > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none">
                                            {totalUnread > 9 ? "9+" : totalUnread}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Buscador */}
                            <div className="px-3 pt-3 pb-1">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Buscar..."
                                        className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* Lista de contactos */}
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="space-y-1 p-3">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className="h-12 bg-slate-100 rounded-xl animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : sortedContacts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                        <p className="text-xs">Sin contactos</p>
                                    </div>
                                ) : (
                                    <ContactListFloating contacts={sortedContacts} openConversation={openConversation} unreadMap={unreadMap} />
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={toggleOpen}
                className="relative h-14 w-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center"
            >
                {open ? (
                    <X className="w-6 h-6" />
                ) : (
                    <MessageSquare className="w-6 h-6" />
                )}
                {!open && totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                )}
            </button>
        </div>
    )
}
