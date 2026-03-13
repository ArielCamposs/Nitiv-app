"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

type UnreadMap = Record<string, number>

type ChatUnreadContextType = {
    unreadMap: UnreadMap
    totalUnread: number
    markAsRead: (conversationId: string) => Promise<void>
    mailboxUnreadMap: UnreadMap
    totalMailboxUnread: number
    markMailboxAsRead: (threadId: string) => Promise<void>
}

const ChatUnreadContext = createContext<ChatUnreadContextType>({
    unreadMap: {},
    totalUnread: 0,
    markAsRead: async () => { },
    mailboxUnreadMap: {},
    totalMailboxUnread: 0,
    markMailboxAsRead: async () => { },
})

export function ChatUnreadProvider({
    userId,
    children,
}: {
    userId: string
    children: React.ReactNode
}) {
    // Stable supabase client — won't change between renders
    const supabase = useRef(createClient()).current
    const [unreadMap, setUnreadMap] = useState<UnreadMap>({})
    const [mailboxUnreadMap, setMailboxUnreadMap] = useState<UnreadMap>({})

    const fetchUnread = useCallback(async () => {
        if (!userId) return

        const { data: reads } = await supabase
            .from("message_reads")
            .select("conversation_id, last_read_at")
            .eq("user_id", userId)

        const readsMap = Object.fromEntries(
            (reads ?? []).map((r) => [r.conversation_id, r.last_read_at])
        )

        const { data: convs } = await supabase
            .from("conversations")
            .select("id")
            .or(`user_a.eq.${userId},user_b.eq.${userId}`)

        const counts: UnreadMap = {}

        await Promise.all(
            (convs ?? []).map(async (conv) => {
                const lastRead = readsMap[conv.id] ?? "1970-01-01"
                const { count } = await supabase
                    .from("messages")
                    .select("*", { count: "exact", head: true })
                    .eq("conversation_id", conv.id)
                    .neq("sender_id", userId)
                    .gt("created_at", lastRead)

                counts[conv.id] = count ?? 0
            })
        )

        setUnreadMap(counts)

        // --- Mailbox Threads ---
        const { data: mReads } = await supabase
            .from("mailbox_thread_reads")
            .select("thread_id, last_read_at")
            .eq("user_id", userId)

        const mReadsMap = Object.fromEntries(
            (mReads ?? []).map((r) => [r.thread_id, r.last_read_at])
        )

        const { data: threads } = await supabase
            .from("mailbox_threads")
            .select("id, updated_at, created_by")
            .neq("status", "cerrado") // Optional: perhaps only active ones matter, but let's fetch all accessible

        const mCounts: UnreadMap = {}

        ;(threads ?? []).forEach(th => {
            // A thread created by the user without new replies might trigger this if they haven't read it,
            // but markMailboxAsRead handles that on creation usually. Or we ignore if they are the creator?
            // Let's just use lastRead.
            const lastRead = mReadsMap[th.id] ?? "1970-01-01"
            if (new Date(th.updated_at) > new Date(lastRead)) {
                // We'll just mark it as 1 unread if updated > last_read
                mCounts[th.id] = 1
            } else {
                mCounts[th.id] = 0
            }
        })

        setMailboxUnreadMap(mCounts)
    }, [userId, supabase])

    useEffect(() => {
        if (!userId) return

        fetchUnread()

        // Broadcast: el emisor envía evento en el canal del receptor
        const channel = supabase
            .channel(`new-message:${userId}`)
            .on(
                "broadcast",
                { event: "message" },
                (payload) => {
                    const { conversation_id } = payload.payload as { conversation_id: string }
                    if (conversation_id) {
                        setUnreadMap(prev => ({
                            ...prev,
                            [conversation_id]: (prev[conversation_id] ?? 0) + 1,
                        }))
                    }
                }
            )
            .subscribe()

        // Realtime para Buzones: cuando se modifica un mailbox_thread (eg: updated_at cambia por nuevo mensaje)
        const mailboxChannel = supabase.channel(`mailbox-updates:${userId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "mailbox_threads" },
                (payload) => {
                    const newThread = payload.new as { id: string, updated_at: string }
                    // Asumimos que si se actualiza, es porque hay un nuevo mensaje
                    // Solo lo marcamos como no leído temporalmente, si el usuario está viéndolo, lo marcará leído.
                    setMailboxUnreadMap(prev => {
                        // Si ya está en la vista no pasa nada, pero como esto corre en root, lo marcamos:
                        return { ...prev, [newThread.id]: 1 }
                    })
                }
            )
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "mailbox_threads" },
                (payload) => {
                    const newThread = payload.new as { id: string }
                    setMailboxUnreadMap(prev => ({ ...prev, [newThread.id]: 1 }))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            supabase.removeChannel(mailboxChannel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    const markAsRead = useCallback(
        async (conversationId: string) => {
            if (!userId) return

            await supabase.from("message_reads").upsert(
                {
                    conversation_id: conversationId,
                    user_id: userId,
                    last_read_at: new Date().toISOString(),
                },
                { onConflict: "conversation_id,user_id" }
            )

            // Actualizar TODAS las UIs de inmediato
            setUnreadMap((prev) => ({ ...prev, [conversationId]: 0 }))
        },
        [userId, supabase]
    )

    const markMailboxAsRead = useCallback(
        async (threadId: string) => {
            if (!userId) return

            await supabase.from("mailbox_thread_reads").upsert(
                {
                    thread_id: threadId,
                    user_id: userId,
                    last_read_at: new Date().toISOString(),
                },
                { onConflict: "thread_id,user_id" }
            )

            setMailboxUnreadMap((prev) => ({ ...prev, [threadId]: 0 }))
        },
        [userId, supabase]
    )

    const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0)
    const totalMailboxUnread = Object.values(mailboxUnreadMap).reduce((a, b) => a + b, 0)

    return (
        <ChatUnreadContext.Provider value={{
            unreadMap, totalUnread, markAsRead,
            mailboxUnreadMap, totalMailboxUnread, markMailboxAsRead
        }}>
            {children}
        </ChatUnreadContext.Provider>
    )
}

export function useChatUnread() {
    return useContext(ChatUnreadContext)
}
