"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { useChatUnread } from "@/context/chat-unread-context"
import { usePresence } from "@/context/presence-context"
import { ContactList } from "@/components/chat/ContactList"
import { AvailabilitySelector } from "@/components/chat/AvailabilitySelector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { MessageSquare, Inbox, Plus, Send } from "lucide-react"
import { cn } from "@/lib/utils"

const BLOCKED_ROLES = ["estudiante", "centro_alumnos"]
const STAFF_ROLES = ["admin", "dupla", "convivencia", "director", "inspector", "utp"]

const STATUS_BADGE: Record<string, string> = {
    abierto: "text-green-700 bg-green-50 border-green-200",
    en_proceso: "text-yellow-700 bg-yellow-50 border-yellow-200",
    cerrado: "text-slate-500 bg-slate-50 border-slate-200",
}
const STATUS_LABEL: Record<string, string> = {
    abierto: "Abierto", en_proceso: "En proceso", cerrado: "Resuelto",
}

interface UserProfile {
    id: string; name: string; last_name: string | null
    role: string; conversationId?: string; availability?: string | null
    updated_at?: string | null
}

interface MailboxThread { 
    id: string; subject: string; status: string; created_at: string; created_by: string;
    creator?: { name: string; last_name: string | null; role: string };
}
interface Mailbox { id: string; name: string; target_role: string; threads: MailboxThread[] }

export function ChatSidebar() {
    const supabase = createClient()
    const router = useRouter()
    const pathname = usePathname()

    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
    const [contacts, setContacts] = useState<UserProfile[]>([])
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
    const [institutionId, setInstitutionId] = useState("")
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Filtro por nombre
    const filteredContacts = search.trim()
        ? contacts.filter(c =>
            `${c.name} ${c.last_name ?? ""}`.toLowerCase().includes(search.toLowerCase())
        )
        : contacts

    const [activeMailboxId, setActiveMailboxId] = useState<string | null>(null)
    const [newThreadSubject, setNewThreadSubject] = useState("")
    const [newThreadContent, setNewThreadContent] = useState("")

    // -- Modal de creación rápida manual
    const [threadModalRole, setThreadModalRole] = useState<{ role: string; label: string } | null>(null)
    const [threadModalSubject, setThreadModalSubject] = useState("")
    const [threadModalContent, setThreadModalContent] = useState("")
    const [isCreatingThread, setIsCreatingThread] = useState(false)

    const { unreadMap, totalUnread, markAsRead, mailboxUnreadMap, totalMailboxUnread } = useChatUnread()
    const { isOnline } = usePresence()

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push("/login")

            const { data: profile } = await supabase
                .from("users").select("id, name, last_name, role, institution_id")
                .eq("id", user.id).single()

            if (!profile || BLOCKED_ROLES.includes(profile.role)) return router.push("/")
            setCurrentUser({ id: user.id, role: profile.role })
            setInstitutionId(profile.institution_id)

            // ── Contactos ──
            const { data: users } = await supabase
                .from("users").select("id, name, last_name, role, created_at")
                .not("role", "in", `(${BLOCKED_ROLES.join(",")})`)
                .eq("institution_id", profile.institution_id)
                .neq("id", user.id)
                .order("name")

            const { data: convs } = await supabase
                .from("conversations").select("id, user_a, user_b")
                .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

            const userIds = (users ?? []).map(u => u.id)
            const { data: avail } = userIds.length > 0
                ? await supabase.from("user_availability").select("user_id, status, updated_at").in("user_id", userIds)
                : { data: [] }

            const availMap: Record<string, { status: string; updated_at: string | null }> = {}
            avail?.forEach(a => { availMap[a.user_id] = { status: a.status, updated_at: a.updated_at } })

            setContacts((users ?? []).map(u => {
                const conv = convs?.find(c =>
                    (c.user_a === user.id && c.user_b === u.id) ||
                    (c.user_b === user.id && c.user_a === u.id)
                )
                const a = availMap[u.id]
                return { ...u, conversationId: conv?.id, availability: a?.status ?? null, updated_at: a?.updated_at || u.created_at }
            }))

            // ── Buzones ──
            const { data: mboxes } = await supabase
                .from("service_mailboxes").select("id, name, target_role")
                .eq("institution_id", profile.institution_id)

            if (mboxes && mboxes.length > 0) {
                const mboxIds = mboxes.map(m => m.id)
                    const { data: threads } = await supabase
                        .from("mailbox_threads")
                        .select(`
                            id, mailbox_id, subject, status, created_at, created_by,
                            creator:users!mailbox_threads_created_by_fkey(name, last_name, role)
                        `)
                    .in("mailbox_id", mboxIds)
                    .order("created_at", { ascending: false })
                setMailboxes(mboxes.map(m => ({
                    ...m,
                    threads: (threads ?? [])
                        .filter(t => t.mailbox_id === m.id)
                        .filter(t => t.created_by === user.id || m.target_role === profile.role || profile.role === "admin")
                        .map(t => ({
                            ...t,
                            creator: Array.isArray(t.creator) ? t.creator[0] : t.creator
                        })) as MailboxThread[],
                })))
            }

            setLoading(false)
        }
        load()
    }, [])

    // ── Realtime: actualizar disponibilidad en vivo ────────────────────────────
    useEffect(() => {
        const channel = supabase
            .channel("chat-page-availability")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "user_availability" },
                (payload) => {
                    const d = payload.new as { user_id: string; status: string; updated_at: string | null } | null
                    if (!d?.user_id) return
                    setContacts(prev =>
                        prev.map(c =>
                            c.id === d.user_id ? { ...c, availability: d.status, updated_at: d.updated_at } : c
                        )
                    )
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    // ── Realtime: actualizar hilos de buzones en vivo ────────────────────────
    useEffect(() => {
        if (!currentUser) return // Dependemos de currentUser para saber el rol y ID
        const threadChannel = supabase
            .channel("chat-page-threads")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "mailbox_threads" },
                (payload) => {
                    const d = payload.new as MailboxThread & { mailbox_id: string }
                    const old = payload.old as { id: string }
                    
                    setMailboxes(prev => prev.map(m => {
                        if (payload.eventType !== "DELETE" && d.mailbox_id !== m.id) return m
                        
                        if (payload.eventType !== "DELETE") {
                            const hasAccess = d.created_by === currentUser.id || m.target_role === currentUser.role || currentUser.role === "admin"
                            if (!hasAccess) return m
                        }

                        let newThreads = [...m.threads]
                        if (payload.eventType === "INSERT") {
                            if (!newThreads.find(t => t.id === d.id)) newThreads = [d, ...newThreads]
                        } else if (payload.eventType === "UPDATE") {
                            newThreads = newThreads.map(t => t.id === d.id ? { ...t, ...d } : t)
                        } else if (payload.eventType === "DELETE") {
                            newThreads = newThreads.filter(t => t.id !== old.id)
                        }

                        newThreads.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        return { ...m, threads: newThreads }
                    }))
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(threadChannel) }
    }, [currentUser, supabase])

    const openChat = async (contactId: string) => {
        if (!currentUser) return
        const { data: existing } = await supabase
            .from("conversations").select("id")
            .or(`and(user_a.eq.${currentUser.id},user_b.eq.${contactId}),and(user_a.eq.${contactId},user_b.eq.${currentUser.id})`)
            .maybeSingle()
        if (existing) { markAsRead(existing.id); return router.push(`/chat/${existing.id}`) }
        const { data: newConv } = await supabase
            .from("conversations").insert({ user_a: currentUser.id, user_b: contactId })
            .select("id").single()
        if (newConv) router.push(`/chat/${newConv.id}`)
    }


    const handleCreateThread = async (mailboxId: string) => {
        if (!newThreadSubject.trim() || !newThreadContent.trim() || !currentUser) return
        const { data: thread } = await supabase
            .from("mailbox_threads")
            .insert({ mailbox_id: mailboxId, created_by: currentUser.id, subject: newThreadSubject.trim() })
            .select("id").single()
        if (!thread) return
        await supabase.from("mailbox_messages").insert({
            thread_id: thread.id, sender_id: currentUser.id, content: newThreadContent.trim(),
        })
        setActiveMailboxId(null); setNewThreadSubject(""); setNewThreadContent("")
        router.push(`/chat/buzones/${thread.id}`)
    }

    const handleCreateThreadFromRole = async () => {
        if (!threadModalRole || !threadModalSubject.trim() || !threadModalContent.trim() || !currentUser) return
        
        setIsCreatingThread(true)
        
        try {
            let { data: mailbox } = await supabase
                .from("service_mailboxes")
                .select("id")
                .eq("institution_id", institutionId)
                .eq("target_role", threadModalRole.role)
                .maybeSingle()
                
            if (!mailbox) {
                const { data: newMb, error } = await supabase.from("service_mailboxes").insert({
                    institution_id: institutionId,
                    name: `Buzón de ${threadModalRole.label}`,
                    target_role: threadModalRole.role
                }).select("id").single()
                
                if (error) throw error
                mailbox = newMb
            }
            
            if (!mailbox) throw new Error("No se pudo obtener o crear el buzón")

            const { data: thread, error: threadErr } = await supabase
                .from("mailbox_threads")
                .insert({ mailbox_id: mailbox.id, created_by: currentUser.id, subject: threadModalSubject.trim() })
                .select("id").single()
                
            if (threadErr || !thread) throw threadErr

            await supabase.from("mailbox_messages").insert({
                thread_id: thread.id, sender_id: currentUser.id, content: threadModalContent.trim(),
            })

            setThreadModalRole(null); setThreadModalSubject(""); setThreadModalContent("")
            router.push(`/chat/buzones/${thread.id}`)
            
        } catch (error) {
            console.error("Error creating thread:", error)
            alert("No se pudo crear el requerimiento. Por favor intenta de nuevo.")
        } finally {
            setIsCreatingThread(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-white border-r border-slate-200">
            <div className="p-4 shrink-0 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2 leading-none">
                            Chat interno
                            {totalUnread > 0 && (
                                <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                                    {totalUnread > 9 ? "9+" : totalUnread}
                                </span>
                            )}
                        </h1>
                        <p className="text-[11px] text-slate-400 mt-0.5">Mensajes con el equipo</p>
                    </div>
                </div>
                {currentUser && <AvailabilitySelector userId={currentUser.id} />}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-slate-200">
                <Tabs defaultValue="mensajes" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="mensajes" className="text-xs gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" /> Mensajes
                        </TabsTrigger>
                        <TabsTrigger value="buzones" className="text-xs gap-1.5 relative">
                            <Inbox className="w-3.5 h-3.5" /> Buzones
                            {totalMailboxUnread > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Mensajes ── */}
                    <TabsContent value="mensajes" className="space-y-3">
                        {!loading && (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar por nombre..."
                                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                </svg>
                            </div>
                        )}
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <ContactList
                                    contacts={filteredContacts}
                                    currentUserId={currentUser?.id ?? ""}
                                    onOpenChat={openChat}
                                    unreadMap={unreadMap}
                                    isOnline={isOnline}
                                    activeConversationId={pathname.startsWith("/chat/") ? pathname.split("/chat/")[1] : undefined}
                                    onOpenMailboxThreadModal={(role, label) => {
                                        setThreadModalRole({ role, label });
                                        setThreadModalSubject("");
                                        setThreadModalContent("");
                                    }}
                                />
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Buzones ── */}
                    <TabsContent value="buzones" className="space-y-4">
                        {mailboxes.length === 0 ? (
                            <div className="py-10 text-center text-slate-400">
                                <Inbox className="w-6 h-6 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No hay buzones configurados</p>
                                {currentUser?.role === "admin" && (
                                    <p className="text-xs mt-1 text-indigo-500">Activa el seed de buzones en Supabase</p>
                                )}
                            </div>
                        ) : (
                            mailboxes.map(mailbox => (
                                <div key={mailbox.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-slate-700">{mailbox.name}</h3>
                                        <Button size="sm" variant="outline" className="text-xs gap-1 h-7 px-2"
                                            onClick={() => setActiveMailboxId(activeMailboxId === mailbox.id ? null : mailbox.id)}>
                                            <Plus className="w-3 h-3" /> Nuevo
                                        </Button>
                                    </div>

                                    {activeMailboxId === mailbox.id && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                                            <input value={newThreadSubject} onChange={e => setNewThreadSubject(e.target.value)}
                                                placeholder="Asunto"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                            <textarea value={newThreadContent} onChange={e => setNewThreadContent(e.target.value)}
                                                placeholder="Mensaje inicial..." rows={2}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveMailboxId(null)}>Cancelar</Button>
                                                <Button size="sm" className="text-xs"
                                                    onClick={() => handleCreateThread(mailbox.id)}
                                                    disabled={!newThreadSubject.trim() || !newThreadContent.trim()}>
                                                    Enviar
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {mailbox.threads.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-2 px-1">Sin hilos activos.</p>
                                    ) : (
                                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                            {mailbox.threads.map(thread => {
                                                const isActive = pathname === `/chat/buzones/${thread.id}`;
                                                return (
                                                    <button key={thread.id} onClick={() => router.push(`/chat/buzones/${thread.id}`)}
                                                        className={cn(
                                                            "w-full text-left group p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors",
                                                            isActive && "bg-slate-50 border-l-2 border-l-primary"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start mb-1.5">
                                                            <span className={cn(
                                                                "text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors pr-2",
                                                                isActive ? "text-primary" : "text-slate-800"
                                                            )}>
                                                                {thread.subject}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {mailboxUnreadMap[thread.id] > 0 && (
                                                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                                                )}
                                                                <span className={cn(
                                                                    "text-[9px] px-1.5 py-0.5 rounded-full font-medium border whitespace-nowrap",
                                                                    STATUS_BADGE[thread.status]
                                                                )}>
                                                                    {STATUS_LABEL[thread.status]}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between mt-1">
                                                            {thread.creator ? (
                                                                <p className="text-[10px] text-slate-500 truncate">
                                                                    De: <span className="font-medium text-slate-700">{thread.creator.name} {thread.creator.last_name || ""}</span>
                                                                </p>
                                                            ) : (
                                                                <p className="text-[10px] text-slate-500 truncate">
                                                                    {new Date(thread.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            )}
                                                            {thread.creator && (
                                                                <p className="text-[9px] text-slate-400 shrink-0 ml-1">
                                                                    {new Date(thread.created_at).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal de Nuevo Hilo por Rol */}
            {threadModalRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Requerimiento para {threadModalRole.label}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">La respuesta llegará a su buzón</p>
                            </div>
                            <button
                                onClick={() => setThreadModalRole(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Asunto</label>
                                <input
                                    type="text"
                                    value={threadModalSubject}
                                    onChange={e => setThreadModalSubject(e.target.value)}
                                    placeholder="Ej. Estudiante con dificultades conductuales"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    maxLength={100}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Mensaje detallado</label>
                                <textarea
                                    value={threadModalContent}
                                    onChange={e => setThreadModalContent(e.target.value)}
                                    placeholder="Describe la situación..."
                                    rows={4}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    className="text-sm rounded-xl"
                                    onClick={() => setThreadModalRole(null)}
                                    disabled={isCreatingThread}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="text-sm shadow-sm rounded-xl gap-2 px-5"
                                    onClick={handleCreateThreadFromRole}
                                    disabled={!threadModalSubject.trim() || !threadModalContent.trim() || isCreatingThread}
                                >
                                    {isCreatingThread ? (
                                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {isCreatingThread ? "Enviando..." : "Enviar requerimiento"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
