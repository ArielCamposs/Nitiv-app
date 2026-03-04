"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Edit, Trash2 } from "lucide-react"
import Link from "next/link"

export function BibliotecaAdminActions({ activityId }: { activityId: string }) {
    const router = useRouter()
    const supabase = createClient()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.")) {
            return
        }

        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from("biblioteca_activities")
                .delete()
                .eq("id", activityId)

            if (error) throw error

            toast.success("Actividad eliminada correctamente")
            router.push("/biblioteca")
            router.refresh()
        } catch (error) {
            console.error("Error deleting activity:", error)
            toast.error("Ocurrió un error al eliminar")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Link href={`/biblioteca/${activityId}/editar`}>
                <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Editar
                </Button>
            </Link>

            <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2"
            >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
        </div>
    )
}
