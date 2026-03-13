import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { NotificationBell } from "@/components/layout/notification-bell"
import { DecBadgeProvider } from "@/context/dec-badge-context"
import { ChatUnreadProvider } from "@/context/chat-unread-context"
import { FloatingChat } from "@/components/chat/floating-chat"
import { FloatingHelpAgent } from "@/components/help/floating-ai-agent"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    // Detectar si es admin para usar su sidebar propio; nombre del colegio para todos los roles
    const { data: profile } = await supabase
        .from("users")
        .select("role, institution_id, institution:institution_id(name)")
        .eq("id", user.id)
        .single()

    const isAdmin = profile?.role === "admin"
    const isStudent = profile?.role === "estudiante" || profile?.role === "centro_alumnos"
    const institutionName =
        (profile as any)?.institution?.name ?? "Institución"

    return (
        <DecBadgeProvider>
            <ChatUnreadProvider userId={user.id}>
                <div className="min-h-screen bg-white">
                    {/* Sidebar condicional — oculto al imprimir */}
                    <div className="print:hidden">
                        {isAdmin
                            ? <AdminSidebar userId={user.id} institutionName={institutionName} />
                            : <Sidebar userId={user.id} institutionName={institutionName} />
                        }
                    </div>

                    {/* Navbar mobile — oculto al imprimir */}
                    <div className="fixed left-0 top-0 z-10 flex w-full items-center border-b bg-white px-4 py-2 md:hidden justify-between print:hidden">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MobileNav userId={user.id} institutionName={institutionName} />
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-bold text-primary leading-tight text-sm">Nitiv</span>
                                <span className="text-xs font-medium text-slate-600 leading-tight truncate">
                                    {institutionName}
                                </span>
                            </div>
                        </div>
                        <NotificationBell userId={user.id} />
                    </div>

                    <main className="min-h-screen pt-14 md:ml-64 md:pt-0 print:ml-0 print:pt-0">
                        {children}
                    </main>

                    {/* Chat flotante — oculto al imprimir */}
                    {!isStudent && <div className="print:hidden"><FloatingChat userId={user.id} /></div>}
                    <div className="print:hidden"><FloatingHelpAgent /></div>
                </div>
            </ChatUnreadProvider>
        </DecBadgeProvider>
    )
}
