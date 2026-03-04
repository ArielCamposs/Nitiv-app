"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createActivitySession } from "@/app/(dashboard)/biblioteca/actions"

interface Course {
    id: string
    name: string
    level: string
}

interface FinishActivityModalProps {
    activityId: string
    activityTitle: string
    courses: Course[]
}

export function FinishActivityModal({ activityId, activityTitle, courses }: FinishActivityModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [courseId, setCourseId] = useState<string>("")
    const router = useRouter()

    async function handleFinishActivity() {
        if (!courseId) {
            toast.error("Por favor, selecciona un curso")
            return
        }

        setLoading(true)
        const res = await createActivitySession({ activityId, courseId })
        setLoading(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Actividad marcada como finalizada. Se notificó a los estudiantes.")
            setOpen(false)
            setCourseId("")
            router.refresh()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Marcar como Realizada
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Actividad Realizada</DialogTitle>
                    <DialogDescription>
                        Selecciona el curso con el que acabas de realizar la actividad <strong className="text-slate-900">{activityTitle}</strong>.
                        Los estudiantes recibirán una notificación para valorar la actividad.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Curso destino</label>
                        <Select value={courseId} onValueChange={setCourseId} disabled={loading}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecciona un curso..." />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map((course) => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.level} - {course.name}
                                    </SelectItem>
                                ))}
                                {courses.length === 0 && (
                                    <SelectItem value="empty" disabled>
                                        No hay cursos disponibles
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleFinishActivity}
                        disabled={loading || !courseId}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirmar y Notificar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
