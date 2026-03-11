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
    courseId: string // Curso para el registro (si hideCourseSelector, es el único; si no, es el valor inicial del selector)
    institutionId: string
    allCourses?: Array<{ id: string; name: string }> // Lista para el selector de curso (no se usa si hideCourseSelector)
    hideCourseSelector?: boolean // Si true, no se muestra el selector de curso en el formulario (se usa el de arriba)
    onRegistered?: () => void | Promise<void> // Llamado tras guardar para refrescar calendario/historial
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
    hideCourseSelector = false,
    onRegistered,
}: Props) {
    const supabase = createClient()
    const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId)
    const [sessionTime, setSessionTime] = useState<"morning" | "afternoon">("morning")
    const [blockNumber, setBlockNumber] = useState<string>("1")
    const [energyLevel, setEnergyLevel] = useState<string>("")
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)
    /** Bloques (1-12) que ya tienen registro hoy para este docente + curso; no se pueden volver a elegir */
    const [registeredBlocksToday, setRegisteredBlocksToday] = useState<number[]>([])
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Si el curso viene del selector de arriba, mantenerlo sincronizado
    useEffect(() => {
        if (hideCourseSelector && initialCourseId) setSelectedCourseId(initialCourseId)
    }, [hideCourseSelector, initialCourseId])

    // Cargar qué bloques ya tienen registro hoy (por día): un bloque solo se puede registrar una vez al día
    useEffect(() => {
        const loadRegisteredBlocks = async () => {
            if (!selectedCourseId) return
            const { from, to } = getTodayRange()
            const { data: rows } = await supabase
                .from("teacher_logs")
                .select("block_number")
                .eq("teacher_id", teacherId)
                .eq("course_id", selectedCourseId)
                .gte("created_at", from)
                .lt("created_at", to)
            const blocks = [...new Set((rows ?? []).map((r) => r.block_number).filter(Boolean))]
            setRegisteredBlocksToday(blocks)
        }
        void loadRegisteredBlocks()
    }, [supabase, teacherId, selectedCourseId])

    // Si el bloque seleccionado ya está registrado hoy, cambiar al primer bloque disponible
    useEffect(() => {
        const num = parseInt(blockNumber, 10)
        if (registeredBlocksToday.includes(num)) {
            const firstAvailable = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(
                (b) => !registeredBlocksToday.includes(b)
            )
            if (firstAvailable != null) setBlockNumber(String(firstAvailable))
        }
    }, [registeredBlocksToday, blockNumber])

    useEffect(() => {
        const num = parseInt(blockNumber, 10)
        if (num <= 4) setSessionTime("morning")
        else setSessionTime("afternoon")
    }, [blockNumber])

    const blockAlreadyRegistered = registeredBlocksToday.includes(parseInt(blockNumber, 10))

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
                setBlockAlreadyRegistered(true)
                toast.info("Ya registraste el clima de este curso y bloque hoy. Elige otro bloque si tienes más clases con este curso.")
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

            toast.success("Clima registrado. Si tienes otra clase con este curso hoy, elige otro bloque.")
            const justRegistered = parseInt(blockNumber, 10)
            setRegisteredBlocksToday((prev) => [...prev, justRegistered].sort((a, b) => a - b))
            setEnergyLevel("")
            setSelectedTags([])
            setNotes("")
            const afterRegister = [...registeredBlocksToday, justRegistered]
            const nextBlock = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((b) => !afterRegister.includes(b))
            if (nextBlock != null) setBlockNumber(String(nextBlock))
            await onRegistered?.()
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

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">¿Cómo estuvo la clase hoy?</CardTitle>
                <CardDescription>
                    Puedes registrar varias veces al día (una por cada bloque/hora con este curso).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Jornada y Bloque (curso elegido arriba cuando hideCourseSelector) */}
                <div className={`grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 ${hideCourseSelector ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
                    {!hideCourseSelector && (
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
                    )}

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
                                {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map((b) => {
                                    const num = parseInt(b, 10)
                                    const yaRegistrado = registeredBlocksToday.includes(num)
                                    return (
                                        <SelectItem key={b} value={b} disabled={yaRegistrado}>
                                            Bloque {b}{yaRegistrado ? " (ya registrado hoy)" : ""}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                        {blockAlreadyRegistered && (
                            <p className="text-[10px] text-amber-700 font-medium">
                                Este bloque ya tiene registro hoy. Elige otro para registrar otra clase.
                            </p>
                        )}
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
                <Button onClick={handleSubmit} disabled={loading || !energyLevel || blockAlreadyRegistered}>
                    {loading ? "Guardando..." : "Guardar clima"}
                </Button>
            </CardFooter>
        </Card>
    )
}
