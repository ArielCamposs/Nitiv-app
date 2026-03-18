"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createAlert } from "@/lib/utils/create-alert"

const EMOTIONS = [
    { id: "muy_mal", label: "Muy mal", emoji: "😞", accent: "#ef4444", gradient: "from-red-100 to-red-50" },
    { id: "mal", label: "Mal", emoji: "😢", accent: "#f97316", gradient: "from-orange-100 to-orange-50" },
    { id: "neutral", label: "Neutral", emoji: "😐", accent: "#6b7280", gradient: "from-gray-100 to-gray-50" },
    { id: "bien", label: "Bien", emoji: "🙂", accent: "#10b981", gradient: "from-emerald-100 to-emerald-50" },
    { id: "muy_bien", label: "Muy bien", emoji: "🤩", accent: "#8b5cf6", gradient: "from-purple-100 to-purple-50" },
] as const

type EmotionId = typeof EMOTIONS[number]["id"]
const RISK_EMOTIONS: EmotionId[] = ["mal", "muy_mal"]

type EmotionTagId =
    | "cansancio"
    | "melancolia"
    | "nervios"
    | "confusion"
    | "esperanza"
    | "frustracion"
    | "verguenza"
    | "impaciencia"
    | "serenidad"
    | "amor_carinio"
    | "apatia"
    | "orgullo"
    | "ansiedad"
    | "tristeza"
    | "enfado"
    | "calma"
    | "tranquilidad"
    | "emocionado"
    | "felicidad"
    | "gratitud"
    | "miedo"
    | "soledad"
    | "aburrimiento"
    | "motivacion"
    | "esperanza2"
    | "celos"
    | "alivio"
    | "satisfaccion"
    | "decepcion"
    | "culpa"
    | "recelo"
    | "sorpresa"
    | "optimismo"

type EmotionTag = {
    id: EmotionTagId
    label: string
    emoji: string
    suggested?: boolean
    // Estilo para el chip seleccionado (no cambia lógica).
    selectedBgClass: string
    selectedTextClass: string
}

const EMOTION_TAGS_PRIMARY: EmotionTag[] = [
    { id: "cansancio", label: "Cansancio", emoji: "😴", suggested: true, selectedBgClass: "bg-amber-50", selectedTextClass: "text-amber-700" },
    { id: "melancolia", label: "Melancolía", emoji: "🌧️", suggested: true, selectedBgClass: "bg-indigo-50", selectedTextClass: "text-indigo-700" },
    { id: "nervios", label: "Nervios", emoji: "😬", suggested: true, selectedBgClass: "bg-orange-50", selectedTextClass: "text-orange-700" },
    { id: "confusion", label: "Confusión", emoji: "🤯", suggested: true, selectedBgClass: "bg-fuchsia-50", selectedTextClass: "text-fuchsia-700" },
    { id: "esperanza", label: "Esperanza", emoji: "🌟", suggested: true, selectedBgClass: "bg-yellow-50", selectedTextClass: "text-yellow-700" },
    { id: "frustracion", label: "Frustración", emoji: "😖", suggested: true, selectedBgClass: "bg-rose-50", selectedTextClass: "text-rose-700" },
    { id: "verguenza", label: "Vergüenza", emoji: "😳", suggested: true, selectedBgClass: "bg-pink-50", selectedTextClass: "text-pink-700" },
    { id: "impaciencia", label: "Impaciencia", emoji: "😤", suggested: true, selectedBgClass: "bg-red-50", selectedTextClass: "text-red-700" },
    { id: "serenidad", label: "Serenidad", emoji: "🕊️", selectedBgClass: "bg-emerald-50", selectedTextClass: "text-emerald-700" },
    { id: "amor_carinio", label: "Amor/Cariño", emoji: "💜", suggested: true, selectedBgClass: "bg-pink-50", selectedTextClass: "text-pink-700" },
    { id: "apatia", label: "Apatía", emoji: "😒", selectedBgClass: "bg-slate-50", selectedTextClass: "text-slate-700" },
    { id: "orgullo", label: "Orgullo", emoji: "💪", suggested: true, selectedBgClass: "bg-indigo-50", selectedTextClass: "text-indigo-700" },
]

// Lista extendida (32 en total). Incluye las de la imagen + adicionales.
const EMOTION_TAGS_ALL: EmotionTag[] = [
    ...EMOTION_TAGS_PRIMARY,
    { id: "ansiedad", label: "Ansiedad", emoji: "😟", selectedBgClass: "bg-orange-50", selectedTextClass: "text-orange-700" },
    { id: "tristeza", label: "Tristeza", emoji: "😔", selectedBgClass: "bg-blue-50", selectedTextClass: "text-blue-700" },
    { id: "enfado", label: "Enfado", emoji: "😠", selectedBgClass: "bg-red-50", selectedTextClass: "text-red-700" },
    { id: "calma", label: "Calma", emoji: "😌", selectedBgClass: "bg-green-50", selectedTextClass: "text-green-700" },
    { id: "tranquilidad", label: "Tranquilidad", emoji: "🧘", selectedBgClass: "bg-emerald-50", selectedTextClass: "text-emerald-700" },
    { id: "emocionado", label: "Emocionado/a", emoji: "🤩", selectedBgClass: "bg-violet-50", selectedTextClass: "text-violet-700" },
    { id: "felicidad", label: "Felicidad", emoji: "😊", selectedBgClass: "bg-yellow-50", selectedTextClass: "text-yellow-700" },
    { id: "gratitud", label: "Gratitud", emoji: "🙏", selectedBgClass: "bg-amber-50", selectedTextClass: "text-amber-700" },
    { id: "miedo", label: "Miedo", emoji: "😰", selectedBgClass: "bg-sky-50", selectedTextClass: "text-sky-700" },
    { id: "soledad", label: "Soledad", emoji: "😞", selectedBgClass: "bg-slate-50", selectedTextClass: "text-slate-700" },
    { id: "aburrimiento", label: "Aburrimiento", emoji: "😑", selectedBgClass: "bg-neutral-50", selectedTextClass: "text-neutral-700" },
    { id: "motivacion", label: "Motivación", emoji: "💪", selectedBgClass: "bg-indigo-50", selectedTextClass: "text-indigo-700" },
    { id: "celos", label: "Celos", emoji: "😬", selectedBgClass: "bg-pink-50", selectedTextClass: "text-pink-700" },
    { id: "alivio", label: "Alivio", emoji: "😮‍💨", selectedBgClass: "bg-emerald-50", selectedTextClass: "text-emerald-700" },
    { id: "satisfaccion", label: "Satisfacción", emoji: "😃", selectedBgClass: "bg-emerald-50", selectedTextClass: "text-emerald-700" },
    { id: "decepcion", label: "Decepción", emoji: "😞", selectedBgClass: "bg-slate-50", selectedTextClass: "text-slate-700" },
    { id: "culpa", label: "Culpa", emoji: "😔", selectedBgClass: "bg-amber-50", selectedTextClass: "text-amber-700" },
    { id: "recelo", label: "Recelo", emoji: "🤨", selectedBgClass: "bg-yellow-50", selectedTextClass: "text-yellow-700" },
    { id: "sorpresa", label: "Sorpresa", emoji: "😮", selectedBgClass: "bg-violet-50", selectedTextClass: "text-violet-700" },
    { id: "optimismo", label: "Optimismo", emoji: "🌞", selectedBgClass: "bg-yellow-50", selectedTextClass: "text-yellow-700" },
]

function getWeekNumber() {
    const now = new Date()
    const year = now.getFullYear()
    const oneJan = new Date(year, 0, 1)
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7)
    return { weekNumber, year }
}

const LEVEL_LABELS: Record<number, string> = {
    1: "Muy poco", 2: "Poco", 3: "Moderado", 4: "Alto", 5: "Muy alto",
}

// Escala progresiva según distancia al índice seleccionado
function getEmojiScale(i: number, selected: number): number {
    const dist = Math.abs(i - selected)
    if (dist === 0) return 1.4
    if (dist === 1) return 1.1
    if (dist === 2) return 0.85
    return 0.7
}

function getEmojiOpacity(i: number, selected: number): number {
    const dist = Math.abs(i - selected)
    if (dist === 0) return 1
    if (dist === 1) return 0.7
    if (dist === 2) return 0.45
    return 0.3
}

interface Props {
    studentId: string
    institutionId: string
    alreadyLogged?: boolean
}

export function EmotionSlider({ studentId, institutionId, alreadyLogged = false }: Props) {
    const [indexValue, setIndexValue] = useState(2)
    const [prevIndex, setPrevIndex] = useState(2)
    const [stressValue, setStressValue] = useState(3)
    const [anxietyValue, setAnxietyValue] = useState(3)
    const [saving, setSaving] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [selectedEmotionTags, setSelectedEmotionTags] = useState<EmotionTagId[]>([])
    const [showAllEmotionTags, setShowAllEmotionTags] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const activeIndex = Math.round(indexValue)
    const stressLevel = Math.round(stressValue)
    const anxietyLevel = Math.round(anxietyValue)

    const emotion = EMOTIONS[activeIndex]
    const isRisk = RISK_EMOTIONS.includes(emotion.id)
    const direction = activeIndex > prevIndex ? 1 : -1

    const handleIndexChange = (newValue: number) => {
        if (Math.round(newValue) !== activeIndex) {
            setPrevIndex(activeIndex)
        }
        setIndexValue(newValue)
    }

    const handleSubmit = async () => {
        if (selectedEmotionTags.length < 3) {
            toast.error("Selecciona 3 o 4 emociones antes de guardar.")
            return
        }
        setSaving(true)
        try {
            const { weekNumber, year } = getWeekNumber()

            const insertPayload = {
                institution_id: institutionId,
                student_id: studentId,
                emotion: emotion.id,
                stress_level: stressLevel,
                anxiety_level: anxietyLevel,
                emotion_tags: selectedEmotionTags,
                type: "daily",
                week_number: weekNumber,
                year,
            }

            const { error } = await supabase.from("emotional_logs").insert(insertPayload)
            if (error) {
                const msg = String(error.message || "")
                // Caso típico: se desplegó el código pero aún no existe la columna en la BD
                // o la "schema cache" del cliente está desactualizada.
                if (msg.toLowerCase().includes("emotion_tags")) {
                    // Retry sin emotion_tags para no bloquear el check-in.
                    const { error: retryError } = await supabase.from("emotional_logs").insert({
                        ...insertPayload,
                        emotion_tags: undefined,
                    })

                    if (retryError) {
                        console.error("Supabase error (retry):", retryError.message, retryError.details)
                        toast.error("No se pudo guardar tu registro. Intenta nuevamente.")
                        return
                    }

                    toast.info("Guardado sin emociones secundarias. Vuelve a recargar cuando la migración esté aplicada.")
                } else {
                    console.error("Supabase error:", error.message, error.details)
                    toast.error("No se pudo guardar tu registro. Intenta nuevamente.")
                    return
                }
            }

            await supabase.from("points").insert({
                institution_id: institutionId,
                student_id: studentId,
                amount: 10,
                reason: "daily_log",
            })

            if (isRisk) {
                const { data: lastLogs } = await supabase
                    .from("emotional_logs")
                    .select("emotion")
                    .eq("student_id", studentId)
                    .eq("type", "daily")
                    .order("created_at", { ascending: false })
                    .limit(3)

                const allNegative = lastLogs?.every(
                    (l) => l.emotion === "mal" || l.emotion === "muy_mal"
                )
                if (allNegative && lastLogs?.length === 3) {
                    await createAlert({
                        institutionId,
                        studentId,
                        type: "registros_negativos",
                        description: "El estudiante lleva 3 o más días seguidos con registros negativos.",
                    })
                }
            }

            toast.success("¡Registro guardado! 🎉")
            setSubmitted(true)
            router.refresh()
        } catch (err) {
            console.error(err)
            toast.error("Ocurrió un error inesperado.")
        } finally {
            setSaving(false)
        }
    }

    const toggleEmotionTag = (tagId: EmotionTagId) => {
        setSelectedEmotionTags((prev) => {
            if (prev.includes(tagId)) {
                return prev.filter((t) => t !== tagId)
            }
            if (prev.length >= 4) {
                toast.info("Máximo 4 emociones. Si quieres, quita una para seleccionar otra.")
                return prev
            }
            return [...prev, tagId]
        })
    }

    if (alreadyLogged || submitted) {
        return (
            <Card className="border-dashed border-emerald-300 bg-emerald-50/60">
                <CardHeader>
                    <CardTitle>Registro de hoy completado ✅</CardTitle>
                    <CardDescription>
                        Ya registraste cómo te sientes hoy. Mañana podrás volver a hacerlo.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="border-0 shadow-md overflow-hidden">

            {/* Fondo animado con transición suave de gradiente */}
            <div
                className={`bg-linear-to-br ${emotion.gradient} transition-all duration-500 ease-in-out`}
            >
                <CardHeader>
                    <CardTitle>¿Cómo te sientes hoy?</CardTitle>
                    <CardDescription>
                        Este registro es personal. Úsalo una vez al día para llevar un diario emocional.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">

                    {/* Emoji central — morphing suave sin AnimatePresence */}
                    <div className="flex flex-col items-center gap-1 py-2 select-none">
                        <motion.div
                            animate={{
                                scale: [1, 0.85, 1],
                                filter: [
                                    "blur(0px) brightness(1)",
                                    "blur(3px) brightness(1.3)",
                                    "blur(0px) brightness(1)",
                                ],
                            }}
                            transition={{
                                duration: 0.35,
                                ease: "easeInOut",
                                times: [0, 0.4, 1],
                            }}
                            key={emotion.id}
                            className="text-8xl"
                            style={{
                                filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.15))",
                            }}
                        >
                            {emotion.emoji}
                        </motion.div>

                        {/* Label con transición CSS */}
                        <span
                            className="text-xl font-bold mt-1 transition-colors duration-300"
                            style={{ color: emotion.accent }}
                        >
                            {emotion.label}
                        </span>

                        {isRisk && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mt-1"
                            >
                                ⚠️ Si necesitas apoyo, la dupla está aquí para ti
                            </motion.span>
                        )}
                    </div>

                    {/* Fila de emojis con escala progresiva */}
                    <div className="space-y-2 px-1">
                        <label className="text-sm font-medium text-gray-500">
                            Desliza para elegir tu emoción
                        </label>

                        <div className="flex justify-between items-end px-0.5 py-2">
                            {EMOTIONS.map((e, i) => (
                                <motion.button
                                    key={e.id}
                                    onClick={() => handleIndexChange(i)}
                                    title={e.label}
                                    animate={{
                                        scale: getEmojiScale(i, activeIndex),
                                        opacity: getEmojiOpacity(i, activeIndex),
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 380,
                                        damping: 22,
                                    }}
                                    className="text-2xl cursor-pointer select-none leading-none"
                                >
                                    {e.emoji}
                                </motion.button>
                            ))}
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={4}
                            step={0.01}
                            value={indexValue}
                            onChange={(e) => handleIndexChange(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
                            style={{ accentColor: emotion.accent }}
                        />

                        <div className="flex justify-between text-xs text-gray-400 px-0.5">
                            <span>Muy mal 😞</span>
                            <span>Muy bien 🤩</span>
                        </div>
                    </div>

                    {/* Nivel de Estrés */}
                    <div className="space-y-2 px-1">
                        <label className="text-sm font-medium text-gray-500">
                            Nivel de estrés{" "}
                            <motion.span
                                key={stressLevel}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="font-bold"
                                style={{ color: emotion.accent }}
                            >
                                {LEVEL_LABELS[stressLevel]}
                            </motion.span>
                        </label>
                        <input
                            type="range"
                            min={1} max={5} step={0.01}
                            value={stressValue}
                            onChange={(e) => setStressValue(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
                            style={{ accentColor: emotion.accent }}
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Muy poco</span>
                            <span>Muy alto</span>
                        </div>
                    </div>

                    {/* Nivel de Ansiedad */}
                    <div className="space-y-2 px-1">
                        <label className="text-sm font-medium text-gray-500">
                            Nivel de ansiedad{" "}
                            <motion.span
                                key={anxietyLevel}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="font-bold"
                                style={{ color: emotion.accent }}
                            >
                                {LEVEL_LABELS[anxietyLevel]}
                            </motion.span>
                        </label>
                        <input
                            type="range"
                            min={1} max={5} step={0.01}
                            value={anxietyValue}
                            onChange={(e) => setAnxietyValue(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
                            style={{ accentColor: emotion.accent }}
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Muy poco</span>
                            <span>Muy alto</span>
                        </div>
                    </div>

                    {/* Emociones secundarias (tags) - al final */}
                    <div className="space-y-3 px-1 pt-1">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Selecciona 3 o 4 emociones
                                </label>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    <span className="mr-1">✨</span>Las emociones con <span className="mr-1">✨</span> son sugerencias basadas en tu bienestar. Puedes elegir cualquiera.
                                </p>
                            </div>
                            <div className="shrink-0 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                                {selectedEmotionTags.length}/4
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(showAllEmotionTags ? EMOTION_TAGS_ALL : EMOTION_TAGS_PRIMARY).map((tag) => {
                                const selected = selectedEmotionTags.includes(tag.id)
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleEmotionTag(tag.id)}
                                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                                            selected
                                                ? `border-indigo-200 ${tag.selectedBgClass} ${tag.selectedTextClass}`
                                                : "border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-200"
                                        }`}
                                        title={tag.label}
                                    >
                                        <span className="text-base">{tag.emoji}</span>
                                        <span className="truncate">{tag.label}</span>
                                        {tag.suggested && (
                                            <span className="ml-auto text-[14px] opacity-70">
                                                ✨
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => setShowAllEmotionTags((v) => !v)}
                                className="text-xs font-medium text-indigo-600 hover:underline"
                            >
                                {showAllEmotionTags ? "Ver menos emociones" : "Ver todas las emociones (32)"}
                            </button>
                        </div>
                    </div>

                    {/* Botón */}
                    <div className="flex justify-end">
                        <motion.div
                            whileTap={{ scale: 0.96 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                            <Button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="text-white font-semibold px-6"
                                style={{ backgroundColor: emotion.accent }}
                            >
                                {saving ? "Guardando..." : "Guardar registro"}
                            </Button>
                        </motion.div>
                    </div>

                </CardContent>
            </div>
        </Card>
    )
}
