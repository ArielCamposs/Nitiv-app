"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type HelpButtonProps = {
    studentId: string
    institutionId: string
}

export function HelpButton({ studentId, institutionId }: HelpButtonProps) {
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const supabase = createClient()

    const handleSend = async () => {
        setLoading(true)
        const { error } = await supabase.from("help_requests").insert({
            student_id: studentId,
            institution_id: institutionId,
            message: message.trim() || null,
            status: "pending",
        })

        if (error) {
            toast.error("No se pudo enviar la solicitud. Intenta de nuevo.")
        } else {
            setSent(true)
            toast.success("Tu solicitud fue enviada. La dupla se pondrá en contacto contigo.")
        }
        setLoading(false)
    }

    const handleClose = () => {
        setOpen(false)
        setMessage("")
        setSent(false)
    }

    return (
        <>
            <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setOpen(true)}
            >
                🆘 Necesito ayuda
            </Button>

            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="max-w-sm">
                    {!sent ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Solicitar ayuda</DialogTitle>
                                <DialogDescription>
                                    Tu mensaje llegará directamente a la dupla psicosocial.
                                    Es completamente confidencial.
                                </DialogDescription>
                            </DialogHeader>

                            <Textarea
                                placeholder="Cuéntanos cómo te sientes o qué necesitas (opcional)..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />

                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={handleClose}>
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleSend}
                                    disabled={loading}
                                >
                                    {loading ? "Enviando..." : "Enviar solicitud"}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>✅ Solicitud enviada</DialogTitle>
                                <DialogDescription>
                                    La dupla psicosocial recibió tu mensaje y se pondrá
                                    en contacto contigo a la brevedad. No estás solo/a.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button onClick={handleClose}>Cerrar</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
