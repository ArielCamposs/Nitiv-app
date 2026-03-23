"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { rememberPendingCaseStatus } from "@/lib/case-status-pending"

type CloseCaseButtonProps = {
    caseId: string
    userId: string
}

export function CloseCaseButton({ caseId, userId }: CloseCaseButtonProps) {
    const supabase = createClient()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [reason, setReason] = useState("")

    const handleCloseCase = async () => {
        if (!reason.trim()) {
            toast.error("Debes indicar un motivo de cierre.")
            return
        }

        try {
            setLoading(true)

            const { error: updErr } = await supabase
                .from("student_cases")
                .update({ status: "cerrado" })
                .eq("id", caseId)
            if (updErr) throw updErr

            const { error: actError } = await supabase
                .from("student_case_actions")
                .insert({
                    case_id: caseId,
                    created_by: userId,
                    action_type: "cierre",
                    description: reason.trim(),
                })
            if (actError) throw actError

            if (typeof window !== "undefined") {
                rememberPendingCaseStatus(caseId, "cerrado")
                window.dispatchEvent(new CustomEvent("student-case-closed", { detail: { caseId } }))
            }
            toast.success("Caso resuelto exitosamente.")
            setOpen(false)
            setReason("")
            router.refresh()
        } catch (e) {
            toast.error("Error al cerrar el caso.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setOpen(true)}
            >
                Resolver caso
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolver caso</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-sm font-medium">Resolución o motivo de cierre</label>
                        <Textarea
                            placeholder="Describe la resolución o motivo por el cual se cierra el caso..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCloseCase}
                            disabled={loading || !reason.trim()}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Marcar como resuelto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
