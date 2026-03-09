import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { NotificationBell } from "@/components/layout/notification-bell"
import { DecBadgeProvider } from "@/context/dec-badge-context"
import { ChatUnreadProvider } from "@/context/chat-unread-context"
import { FloatingChat } from "@/components/chat/floating-chat"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    // Detectar si es admin para usar su sidebar propio
    const { data: profile } = await supabase
        .from("users")
        .select("role, institution_id, institutions(name)")
        .eq("id", user.id)
        .single()

    const isAdmin = profile?.role === "admin"
    const isStudent = profile?.role === "estudiante" || profile?.role === "centro_alumnos"
    const institutionName =
        (profile as any)?.institutions?.name ?? "Institución"

    return (
        <DecBadgeProvider>
            <ChatUnreadProvider userId={user.id}>
                <div className="min-h-screen bg-white">
                    {/* Sidebar condicional */}
                    {isAdmin
                        ? <AdminSidebar userId={user.id} />
                        : <Sidebar userId={user.id} />
                    }

                    {/* Navbar mobile */}
                    <div className="fixed left-0 top-0 z-10 flex w-full items-center border-b bg-white px-4 py-2 md:hidden justify-between">
                        <div className="flex items-center">
                            <MobileNav userId={user.id} />
                            <div className="ml-2 flex flex-col">
                                <span className="font-bold text-primary leading-tight">Nitiv</span>
                                <span className="text-[11px] text-slate-500 leading-tight truncate max-w-[200px]">
                                    {institutionName}
                                </span>
                            </div>
                        </div>
                        <NotificationBell userId={user.id} />
                    </div>

                    <main className="min-h-screen pt-14 md:ml-64 md:pt-0">
                        {children}
                    </main>

                    {/* Chat flotante — solo para roles no estudiante */}
                    {!isStudent && <FloatingChat userId={user.id} />}
                </div>
            </ChatUnreadProvider>
        </DecBadgeProvider>
    )
}
