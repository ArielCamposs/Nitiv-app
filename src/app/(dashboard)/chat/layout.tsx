"use client"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { usePathname } from "next/navigation"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    // Si estamos en /chat (o cualquier sub-ruta que sea sólo índice), mostramos la barra lateral
    // Así evitamos mostrar 2 paneles en móviles.
    const isChatRoot = pathname === "/chat"

    return (
        <div className={`flex h-[calc(100vh-56px)] md:h-[calc(100vh-0px)] w-full bg-slate-50 overflow-hidden ${isChatRoot ? "is-chat-root" : ""}`}>
            {/* Sidebar (Contacts & Mailboxes) */}
            <div className={`w-full md:w-[320px] lg:w-[380px] shrink-0 border-r border-slate-200 bg-white ${isChatRoot ? "block" : "hidden md:block"}`}>
                <ChatSidebar />
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col min-w-0 bg-slate-50 ${isChatRoot ? "hidden md:flex" : "flex"}`}>
                {children}
            </div>
        </div>
    )
}
