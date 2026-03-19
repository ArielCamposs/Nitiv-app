"use client"
import React, { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface PresenceContextType {
    onlineUsers: Set<string>
    isOnline: (id: string) => boolean
}

const PresenceContext = createContext<PresenceContextType>({
    onlineUsers: new Set(),
    isOnline: () => false,
})

export const usePresence = () => useContext(PresenceContext)

export function PresenceProvider({ children, userId, institutionId }: { children: React.ReactNode, userId: string, institutionId: string }) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!userId || !institutionId) return

        const supabase = createClient()
        let interval: NodeJS.Timeout

        const channel = supabase.channel(`presence-${institutionId}`, {
            config: { presence: { key: userId } },
        })

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState<{ userId: string }>()
                const ids = new Set(
                    Object.values(state)
                        .flat()
                        .map((p: any) => p.userId)
                )
                setOnlineUsers(ids)
            })
            .subscribe(async status => {
                if (status === "SUBSCRIBED") {
                    await channel.track({ userId, online_at: new Date().toISOString() })
                    
                    const updateTimestamp = async () => {
                        const { data } = await supabase.from("user_availability").select("status").eq("user_id", userId).maybeSingle()
                        await supabase.from("user_availability").upsert({
                            user_id: userId,
                            status: data?.status || "disponible",
                            updated_at: new Date().toISOString()
                        })
                    }

                    await updateTimestamp()
                    interval = setInterval(updateTimestamp, 2 * 60 * 1000)
                }
            })

        return () => {
            if (interval) clearInterval(interval)
            channel.untrack()
            supabase.removeChannel(channel)
        }
    }, [userId, institutionId])

    const isOnline = (id: string) => onlineUsers.has(id)

    return (
        <PresenceContext.Provider value={{ onlineUsers, isOnline }}>
            {children}
        </PresenceContext.Provider>
    )
}
