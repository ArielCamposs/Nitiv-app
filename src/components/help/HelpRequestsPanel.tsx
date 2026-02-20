"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

type HelpRequest = {
    id: string
    message: string | null
    status: string
    created_at: string
    student: {
        name: string
        last_name: string
        course: { name: string } | null
    }
}

export function HelpRequestsPanel({ institutionId }: { institutionId: string }) {
    const [requests, setRequests] = useState<HelpRequest[]>([])
    const supabase = createClient()

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from("help_requests")
                .select(`
                    id, message, status, created_at,
                    student:student_id (
                        name, last_name,
                        course:course_id ( name )
                    )
                `)
                .eq("institution_id", institutionId)
                .order("created_at", { ascending: false })

            setRequests((data as any) ?? [])
        }
        load()

        // Escuchar nuevas solicitudes en tiempo real
        const channel = supabase
            .channel("help-requests-live")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "help_requests",
                filter: `institution_id=eq.${institutionId}`
            }, () => {
                toast("🆘 Nueva solicitud de ayuda recibida")
                load()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [institutionId])

    const updateStatus = async (id: string, newStatus: "seen" | "resolved") => {
        const { data: { user } } = await supabase.auth.getUser()

        await supabase
            .from("help_requests")
            .update({
                status: newStatus,
                ...(newStatus === "seen" && { seen_at: new Date().toISOString() }),
                ...(newStatus === "resolved" && {
                    resolved_at: new Date().toISOString(),
                    resolved_by: user?.id
                }),
            })
            .eq("id", id)

        setRequests((prev) =>
            prev.map((r) => r.id === id ? { ...r, status: newStatus } : r)
        )
        toast.success(newStatus === "seen" ? "Marcado como visto" : "Caso resuelto")
    }

    const STATUS_BADGE: Record<string, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
        pending: { label: "Pendiente", variant: "destructive" },
        seen: { label: "En atención", variant: "outline" },
        resolved: { label: "Resuelto", variant: "secondary" },
    }

    const pending = requests.filter((r) => r.status === "pending")
    const others = requests.filter((r) => r.status !== "pending")

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">Solicitudes de ayuda</h2>
                {pending.length > 0 && (
                    <Badge variant="destructive">
                        {pending.length} pendiente{pending.length > 1 ? "s" : ""}
                    </Badge>
                )}
            </div>

            {requests.length === 0 && (
                <p className="text-sm text-slate-500">No hay solicitudes aún.</p>
            )}

            {[...pending, ...others].map((req) => {
                const badge = STATUS_BADGE[req.status]
                return (
                    <Card
                        key={req.id}
                        className={req.status === "pending" ? "border-red-200 bg-red-50" : ""}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between text-base">
                                <span>
                                    {req.student.name} {req.student.last_name}
                                    {req.student.course && (
                                        <span className="ml-2 text-xs text-slate-400 font-normal">
                                            {req.student.course.name}
                                        </span>
                                    )}
                                </span>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {req.message ? (
                                <p className="text-sm text-slate-600 bg-white rounded-lg p-3 border">
                                    &ldquo;{req.message}&rdquo;
                                </p>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Sin mensaje adicional</p>
                            )}
                            <p className="text-xs text-slate-400">
                                {new Date(req.created_at).toLocaleString("es-CL")}
                            </p>
                            <div className="flex gap-2">
                                {req.status === "pending" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateStatus(req.id, "seen")}
                                    >
                                        Marcar como visto
                                    </Button>
                                )}
                                {req.status !== "resolved" && (
                                    <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => updateStatus(req.id, "resolved")}
                                    >
                                        Marcar resuelto
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
