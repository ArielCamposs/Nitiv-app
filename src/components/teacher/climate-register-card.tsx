"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Sun, Sunset } from "lucide-react"

const ENERGY_OPTIONS = [
    {
        value: "explosiva",
        label: "🔴 Explosiva",
        desc: "Gritos, conflictos, descontrol",
    },
    {
        value: "inquieta",
        label: "🟡 Inquieta",
        desc: "Mucho ruido, dificultad para iniciar",
    },
    {
        value: "regulada",
        label: "🟢 Regulada",
        desc: "Ruido normal de trabajo, calma",
    },
    {
        value: "apatica",
        label: "🔵 Apática",
        desc: "Silencio excesivo, desánimo, falta de respuesta",
    },
]

const CONDUCT_TAGS = [
    "Trabajadores / Enfocados",
    "Participativos",
    "Desafiantes / Discutidores",
    "Agotados / Sin energía",
    "Colaborativos",
]

type Props = {
    teacherId: string
    courseId: string // Default or initial course
    institutionId: string
    allCourses?: Array<{ id: string; name: string }> // New: to allow selecting any course
}

function getTodayRange() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return { from: today.toISOString(), to: tomorrow.toISOString() }
}

export function ClimateRegisterCard({
    teacherId,
    courseId: initialCourseId,
    institutionId,
    allCourses = [],
}: Props) {
    const supabase = createClient()
    const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId)
    const [sessionTime, setSessionTime] = useState<"morning" | "afternoon">("morning")
    const [blockNumber, setBlockNumber] = useState<string>("1")
    const [energyLevel, setEnergyLevel] = useState<string>("")
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)
    const [alreadyDoneToday, setAlreadyDoneToday] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const checkExisting = async () => {
            if (!selectedCourseId || !blockNumber) return
            
            const { from, to } = getTodayRange()

            const { data: existing } = await supabase
                .from("teacher_logs")
                .select("id")
                .eq("teacher_id", teacherId)
                .eq("course_id", selectedCourseId)
                .eq("block_number", parseInt(blockNumber))
                .gte("created_at", from)
                .lt("created_at", to)
                .maybeSingle()

            setAlreadyDoneToday(!!existing)
        }

        // Automatizar jornada según bloque
        const num = parseInt(blockNumber)
        if (num <= 4) setSessionTime("morning")
        else setSessionTime("afternoon")

        void checkExisting()
    }, [supabase, teacherId, selectedCourseId, blockNumber])

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag)
                ? prev.filter((t) => t !== tag)
                : prev.length < 2
                    ? [...prev, tag]
                    : prev
        )
    }

    const handleSubmit = async () => {
        if (!energyLevel) {
            toast.error("Selecciona el nivel de energía de la clase.")
            return
        }

        if (!blockNumber) {
            toast.error("Selecciona el bloque de la clase.")
            return
        }

        try {
            setLoading(true)

            const { from, to } = getTodayRange()

            const { data: existing } = await supabase
                .from("teacher_logs")
                .select("id")
                .eq("teacher_id", teacherId)
                .eq("course_id", selectedCourseId)
                .eq("block_number", parseInt(blockNumber))
                .gte("created_at", from)
                .lt("created_at", to)
                .maybeSingle()

            if (existing) {
                setAlreadyDoneToday(true)
                toast.info("Ya registraste el clima de este curso y bloque hoy.")
                return
            }

            const { error } = await supabase.from("teacher_logs").insert({
                institution_id: institutionId,
                teacher_id: teacherId,
                course_id: selectedCourseId,
                energy_level: energyLevel,
                session_time: sessionTime,
                block_number: parseInt(blockNumber),
                tags: selectedTags,
                notes: notes.trim() || null,
                log_date: new Date().toISOString().split("T")[0],
            })

            if (error) {
                console.error(error)
                toast.error("No se pudo guardar el registro de clima.")
                return
            }

            toast.success("Clima de aula registrado.")
            setAlreadyDoneToday(true)
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) {
        return (
            <Card className="animate-pulse bg-slate-100/50 border-dashed">
                <div className="h-[300px]" />
            </Card>
        )
    }

    if (alreadyDoneToday) {
        return (
            <Card className="border-dashed border-emerald-300 bg-emerald-50/60">
                <CardHeader>
                    <CardTitle>Clima de hoy registrado</CardTitle>
                    <CardDescription>
                        Ya registraste el clima de este curso hoy. Mañana podrás hacerlo de nuevo.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">¿Cómo estuvo la clase hoy?</CardTitle>
                <CardDescription>
                    Registro rápido del clima de aula. Solo toma 1 minuto.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Selección de Curso, Jornada y Bloque */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Curso</label>
                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                            <SelectTrigger className="bg-white border-slate-200">
                                <SelectValue placeholder="Seleccionar curso" />
                            </SelectTrigger>
                            <SelectContent>
                                {allCourses.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                                {allCourses.length === 0 && (
                                    <SelectItem value={initialCourseId} disabled>
                                        Paso previo requerido
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Jornada</label>
                        <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-lg h-10">
                            {[
                                { id: "morning", label: "Mañana", icon: Sun },
                                { id: "afternoon", label: "Tarde", icon: Sunset },
                            ].map((s) => {
                                const Icon = s.icon
                                const active = sessionTime === s.id
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSessionTime(s.id as any)}
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-all ${active
                                                ? "bg-slate-900 text-white shadow-sm"
                                                : "text-slate-500 hover:bg-slate-50"
                                            }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${active ? "text-amber-400" : ""}`} />
                                        {s.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Bloque / Hora</label>
                        <Select value={blockNumber} onValueChange={setBlockNumber}>
                            <SelectTrigger className="bg-white border-slate-200">
                                <SelectValue placeholder="Seleccionar bloque" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map((b) => (
                                    <SelectItem key={b} value={b}>
                                        Bloque {b}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Paso 1: Termómetro de energía */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Paso 1 — Nivel de energía de la clase
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {ENERGY_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setEnergyLevel(opt.value)}
                                className={`rounded-lg border p-3 text-left transition-all ${energyLevel === opt.value
                                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                            >
                                <div className="text-sm font-medium">{opt.label}</div>
                                <div className="text-xs text-slate-500">{opt.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Paso 2: Etiquetas de conducta */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Paso 2 — Etiquetas de conducta{" "}
                        <span className="text-slate-400 font-normal">(máx. 2)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {CONDUCT_TAGS.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`rounded-full border px-3 py-1 text-xs transition-all ${selectedTags.includes(tag)
                                        ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Paso 3: Nota libre */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Paso 3 — Observación breve{" "}
                        <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <Textarea
                        rows={3}
                        placeholder="Ej: El curso llegó muy activo después de educación física..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleSubmit} disabled={loading || !energyLevel}>
                    {loading ? "Guardando..." : "Guardar clima"}
                </Button>
            </CardFooter>
        </Card>
    )
}
