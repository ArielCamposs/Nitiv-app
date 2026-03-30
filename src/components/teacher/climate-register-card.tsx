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
import { Sun, Sunset, ArrowRight } from "lucide-react"
import {
    CLASSROOM_CLIMATES,
    CLIMATE_CHARACTERIZATION_TAGS,
    CLIMATE_META,
    type ClassroomClimate,
} from "@/lib/climate-evaluation"
import { cn } from "@/lib/utils"

type Props = {
    teacherId: string
    courseId: string
    institutionId: string
    allCourses?: Array<{ id: string; name: string }>
    hideCourseSelector?: boolean
    onRegistered?: () => void | Promise<void>
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
    const [selectedClimate, setSelectedClimate] = useState<ClassroomClimate | "">("")
    const [step, setStep] = useState<1 | 2>(1)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)
    const [registeredBlocksToday, setRegisteredBlocksToday] = useState<number[]>([])
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (hideCourseSelector && initialCourseId) setSelectedCourseId(initialCourseId)
    }, [hideCourseSelector, initialCourseId])

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

    const selectClimate = (c: ClassroomClimate) => {
        setSelectedClimate(c)
        setStep(2)
        setSelectedTags([])
    }

    const backToClimates = () => {
        setStep(1)
        setSelectedClimate("")
        setSelectedTags([])
    }

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
        if (!selectedClimate) {
            toast.error("Selecciona el clima del aula.")
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
                toast.info("Ya registraste el clima de este curso y bloque hoy. Elige otro bloque si tienes más clases con este curso.")
                return
            }

            const { error } = await supabase.from("teacher_logs").insert({
                institution_id: institutionId,
                teacher_id: teacherId,
                course_id: selectedCourseId,
                energy_level: selectedClimate,
                session_time: sessionTime,
                block_number: parseInt(blockNumber),
                tags: selectedTags,
                notes: notes.trim() || null,
                log_date: new Date().toISOString().split("T")[0],
            })

            if (error) {
                console.error("Supabase insert error:", JSON.stringify(error, null, 2), error)
                toast.error(`No se pudo guardar el registro de clima. ${error.message || ""}`)
                return
            }

            toast.success("Clima registrado. Si tienes otra clase con este curso hoy, elige otro bloque.")
            const justRegistered = parseInt(blockNumber, 10)
            const mergedBlocks = [...new Set([...registeredBlocksToday, justRegistered])].sort((a, b) => a - b)
            setRegisteredBlocksToday(mergedBlocks)
            setSelectedClimate("")
            setStep(1)
            setSelectedTags([])
            setNotes("")
            const nextFree = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((b) => !mergedBlocks.includes(b))
            if (nextFree != null) setBlockNumber(String(nextFree))
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
        <Card className="overflow-hidden border-slate-200">
            <CardHeader className="pb-3 bg-gradient-to-r from-emerald-700/90 to-teal-700/90 text-white rounded-t-lg border-b border-emerald-800/30">
                <CardTitle className="text-lg text-white">Clima de aula</CardTitle>
                <CardDescription className="text-emerald-100">
                    Registro obligatorio: elige el clima. Luego, opcionalmente, hasta 2 características (basado en evaluación holística del clima de aula).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

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
                                        onClick={() => setSessionTime(s.id as "morning" | "afternoon")}
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

                {step === 1 && (
                    <div className="space-y-4">
                        <p className="text-center text-sm font-semibold text-slate-600">
                            ¿Cuál de estas opciones describe mejor cómo estuvo el curso hoy?
                        </p>
                        <div className="rounded-2xl border border-slate-800 bg-[#2d2d2d] p-4 sm:p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {CLASSROOM_CLIMATES.map((key) => {
                                    const m = CLIMATE_META[key]
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            disabled={blockAlreadyRegistered}
                                            onClick={() => selectClimate(key)}
                                            className={cn(
                                                "flex flex-col items-center text-center rounded-2xl p-4 min-h-[140px] transition-all",
                                                "border-2 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25",
                                                "focus:outline-none focus:ring-2 focus:ring-emerald-400/60",
                                                "disabled:opacity-40 disabled:pointer-events-none"
                                            )}
                                        >
                                            <span className="text-4xl sm:text-5xl leading-none mb-2" aria-hidden>
                                                {m.emoji}
                                            </span>
                                            <span className="sel-font text-sm font-black text-white leading-tight">
                                                {m.label}
                                            </span>
                                            <span className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                                                {m.desc}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && selectedClimate && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <button
                            type="button"
                            onClick={backToClimates}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                            ← Cambiar clima
                        </button>

                        <div
                            className="rounded-2xl border border-white/15 p-5 space-y-4"
                            style={{
                                backgroundColor: "#2d2d2d",
                                boxShadow: `0 0 0 1px ${CLIMATE_META[selectedClimate].color}33`,
                            }}
                        >
                            <div className="flex items-center gap-3 text-white">
                                <span className="text-3xl">{CLIMATE_META[selectedClimate].emoji}</span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-white/50">Clima elegido</p>
                                    <p className="text-lg font-black">{CLIMATE_META[selectedClimate].label}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-slate-300 mb-3">
                                    ¿Qué lo caracterizó? <span className="text-slate-500 font-normal">(opcional — máx. 2)</span>
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {CLIMATE_CHARACTERIZATION_TAGS.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={cn(
                                                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                                                selectedTags.includes(tag)
                                                    ? "border-white bg-white text-slate-900"
                                                    : "border-white/30 text-slate-200 hover:border-white/50 hover:bg-white/5"
                                            )}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-300 block mb-2">
                                    Observación breve <span className="text-slate-500 font-normal">(opcional)</span>
                                </label>
                                <Textarea
                                    rows={3}
                                    placeholder="Ej.: El curso llegó muy activo después de educación física…"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="bg-black/20 border-white/20 text-white placeholder:text-slate-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
            {step === 2 && (
                <CardFooter className="flex justify-between gap-3 border-t bg-slate-50/80">
                    <Button type="button" variant="ghost" onClick={backToClimates}>
                        Atrás
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !selectedClimate || blockAlreadyRegistered}
                        className="gap-2 min-w-[200px] bg-[#2d2d2d] text-white border-2 border-white hover:bg-[#3d3d3d]"
                    >
                        {loading ? "Guardando…" : (
                            <>
                                Guardar registro
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
