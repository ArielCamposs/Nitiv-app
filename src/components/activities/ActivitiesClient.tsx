"use client"

import { useState, useMemo } from "react"
import { ActivityFormModal } from "@/components/activities/ActivityFormModal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Plus, Clock, MapPin, Users, BookOpen,
    Star, MessageSquare, ChevronDown, ChevronUp, Calendar,
    Palette, Mic, PartyPopper, GraduationCap, Trophy, Pin
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function computeStatus(start: string, end: string) {
    const now = new Date()
    if (now < new Date(start)) return "programada"
    if (now > new Date(end)) return "finalizada"
    return "en_desarrollo"
}

const STATUS_META = {
    programada: { label: "Programada", dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700", border: "border-l-indigo-400" },
    en_desarrollo: { label: "En desarrollo", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-400" },
    finalizada: { label: "Finalizada", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500", border: "border-l-slate-300" },
    socioemocional: { label: "Socioemocional", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700", border: "border-l-amber-400" },
}

const TYPE_LABELS: Record<string, string> = {
    taller: "Taller",
    charla: "Charla",
    deporte: "Deporte",
    cultural: "Cultural",
    academico: "Académico",
    reunion: "Reunión",
    socioemocional: "Socioemocional",
    otro: "Otro",
}

const COLOR_MAP: Record<string, { bg: string; text: string; icon: string }> = {
    purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "text-purple-200" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "text-blue-200" },
    green: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "text-emerald-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", icon: "text-amber-200" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", icon: "text-rose-200" },
    slate: { bg: "bg-slate-50", text: "text-slate-600", icon: "text-slate-200" },
}

const ROLE_LABELS: Record<string, string> = {
    "director": "Director(a)",
    "admin": "Plataforma Nitiv",
    "docente": "Docente",
    "dupla": "Especialista Psicosocial",
    "convivencia": "Convivencia Escolar",
    "utp": "UTP",
    "inspector": "Inspector(a)",
}

const TYPE_ICONS: Record<string, React.ElementType> = {
    taller: Palette, charla: Mic, evento: PartyPopper,
    ceremonia: GraduationCap, deportivo: Trophy, otro: Pin,
}

const RATING_LABELS: Record<number, string> = {
    1: "Muy mala", 2: "Mala", 3: "Regular", 4: "Buena", 5: "¡Excelente!",
}

const fmtDate = (dt: string) =>
    new Date(dt).toLocaleDateString("es-CL", {
        weekday: "long", day: "numeric", month: "long",
    })

const fmtTime = (dt: string) =>
    new Date(dt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Course { id: string; name: string; section: string | null }

interface Props {
    activities: any[]
    courses: Course[]
    userId: string
    studentId: string | null
    userRole: string
    institutionId: string
    canManage: boolean
}

// ─── Panel de valoraciones Staff ──────────────────────────────────────────────
function RatingsPanel({ activityId }: { activityId: string }) {
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [ratings, setRatings] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)

    const loadRatings = async () => {
        if (loaded) { setOpen(o => !o); return }
        setLoading(true)
        const { data } = await supabase
            .from("activity_ratings")
            .select("rating, comment, created_at, users:rated_by(name, last_name)")
            .eq("activity_id", activityId)
            .order("created_at", { ascending: false })
        setRatings(data ?? [])
        setLoaded(true)
        setLoading(false)
        setOpen(true)
    }

    const avg = ratings.length
        ? (ratings.reduce((a, r) => a + r.rating, 0) / ratings.length).toFixed(1)
        : null

    return (
        <div className="space-y-2 mt-3 border-t pt-3">
            <button
                onClick={loadRatings}
                className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
                <MessageSquare className="w-3.5 h-3.5" />
                {loading ? "Cargando..." : "Ver valoraciones de estudiantes"}
                {loaded && (open
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                )}
            </button>

            {open && loaded && (
                <div className="space-y-2">
                    {ratings.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">
                            Aún no hay valoraciones para esta actividad.
                        </p>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="text-sm font-bold text-amber-700">{avg}/5</span>
                                <span className="text-xs text-amber-600">
                                    ({ratings.length} valoración{ratings.length !== 1 ? "es" : ""})
                                </span>
                            </div>
                            <div className="divide-y rounded-lg border bg-white overflow-hidden">
                                {ratings.map((r, i) => (
                                    <div key={i} className="px-3 py-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-700">
                                                {(r.users as any)?.name} {(r.users as any)?.last_name}
                                            </span>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <Star key={n} className={cn(
                                                        "w-3 h-3",
                                                        n <= r.rating
                                                            ? "fill-amber-400 text-amber-400"
                                                            : "text-slate-200"
                                                    )} />
                                                ))}
                                            </div>
                                        </div>
                                        {r.comment && (
                                            <p className="text-xs text-slate-500 mt-1">"{r.comment}"</p>
                                        )}
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {new Date(r.created_at).toLocaleDateString("es-CL", {
                                                day: "numeric", month: "short", year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Modal de detalle + rating ─────────────────────────────────────────────────
function ActivityModal({
    activity,
    isStudent,
    studentId,
    canManage,
    onClose,
    onEdit,
}: {
    activity: any
    isStudent: boolean
    studentId: string | null
    canManage: boolean
    onClose: () => void
    onEdit: (a: any) => void
}) {
    const supabase = createClient()
    const status = computeStatus(activity.start_datetime, activity.end_datetime)
    const meta = STATUS_META[status as keyof typeof STATUS_META]
    const isFinalizada = status === "finalizada"

    const activityCourses = (activity.activity_courses ?? [])
        .map((ac: any) => ac.courses?.name).filter(Boolean)

    const materials: string[] = Array.isArray(activity.materials)
        ? activity.materials
        : typeof activity.materials === "string" && activity.materials.trim()
            ? activity.materials.split(",").map((m: string) => m.trim())
            : []

    // Rating state
    const [hover, setHover] = useState(0)
    const [selected, setSelected] = useState(0)
    const [comment, setComment] = useState("")
    const [saving, setSaving] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const handleSubmitRating = async () => {
        if (!selected) {
            toast.error("Debes seleccionar al menos una estrella ⭐")
            return
        }
        setShowConfirm(true)
    }

    const confirmRating = async () => {
        setSaving(true)
        try {
            console.log("DEBUG rating payload", {
                activity_id: activity.id,
                rated_by: studentId,
                selected,
                comment,
            })

            const { error } = await supabase
                .from("activity_ratings")
                .insert({
                    activity_id: activity.id,
                    rated_by: studentId,
                    rating: selected,
                    comment: comment.trim() || null,
                })

            if (error) {
                console.error("Rating error:", error)
                if (error.code === "23505") {
                    toast.error("Ya enviaste una valoración para esta actividad.")
                } else {
                    toast.error("No se pudo guardar tu valoración")
                }
                return
            }
            toast.success("¡Valoración enviada! Gracias por tu opinión ⭐")
            setSubmitted(true)
            setShowConfirm(false)
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl shrink-0 text-slate-400">
                                {TYPE_ICONS[activity.activity_type] ? (() => {
                                    const IconInfo = TYPE_ICONS[activity.activity_type]
                                    return <IconInfo className="w-6 h-6" />
                                })() : <Pin className="w-6 h-6" />}
                            </span>
                            <DialogTitle className="text-lg leading-snug">
                                {activity.title}
                            </DialogTitle>
                        </div>
                        <DialogDescription asChild>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                <Badge className={cn("text-[11px]", meta.badge)}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full mr-1 inline-block", meta.dot)} />
                                    {meta.label}
                                </Badge>
                                {activity.activity_type && (
                                    <Badge variant="outline" className="text-[11px]">
                                        {TYPE_LABELS[activity.activity_type] ?? activity.activity_type}
                                    </Badge>
                                )}
                                {activity.target === "general" ? (
                                    <Badge variant="outline" className="text-[11px] border-indigo-200 text-indigo-600">
                                        🏫 Toda la institución
                                    </Badge>
                                ) : activity.target === "docentes" ? (
                                    <Badge variant="outline" className="text-[11px] border-amber-200 text-amber-600">
                                        👩‍🏫 Solo Docentes
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[11px] border-violet-200 text-violet-600">
                                        🎯 Por curso
                                    </Badge>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">

                        {/* Fecha y hora */}
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="capitalize">{fmtDate(activity.start_datetime)}</span>
                            <span className="text-slate-400">·</span>
                            <span>{fmtTime(activity.start_datetime)}</span>
                            {activity.end_datetime && (
                                <span className="text-slate-400">→ {fmtTime(activity.end_datetime)}</span>
                            )}
                        </div>

                        {/* Lugar */}
                        {activity.location && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{activity.location}</span>
                            </div>
                        )}

                        {/* Cursos */}
                        {activityCourses.length > 0 && (
                            <div className="flex items-start gap-2 text-sm text-slate-600">
                                <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1">
                                    {activityCourses.map((c: string) => (
                                        <span key={c} className="bg-slate-100 rounded-full px-2 py-0.5 text-xs">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Descripción */}
                        {activity.description && (
                            <div className="rounded-lg bg-slate-50 border p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                    Descripción
                                </p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                    {activity.description}
                                </p>
                            </div>
                        )}

                        {/* Materiales */}
                        {materials.length > 0 && (
                            <div className="flex items-start gap-2">
                                <BookOpen className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1.5">
                                    {materials.map((m) => (
                                        <span key={m} className="bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 text-xs">
                                            {m}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Rating estudiante ── */}
                        {isStudent && studentId && isFinalizada && (
                            <div className="border-t pt-4">
                                {submitted ? (
                                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                                        <Star className="w-4 h-4 fill-emerald-500 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="font-medium">¡Valoración enviada!</p>
                                            <p className="text-xs text-emerald-600 mt-0.5">
                                                Le diste {selected} estrella{selected !== 1 ? "s" : ""} · {RATING_LABELS[selected]}
                                                {comment && ` · "${comment}"`}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-slate-700">
                                            ¿Cómo fue esta actividad para ti?
                                        </p>

                                        {/* Estrellas */}
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <button
                                                    key={n}
                                                    onMouseEnter={() => setHover(n)}
                                                    onMouseLeave={() => setHover(0)}
                                                    onClick={() => setSelected(n)}
                                                    className="transition-transform hover:scale-110 active:scale-95"
                                                >
                                                    <Star className={cn(
                                                        "w-8 h-8 transition-colors",
                                                        n <= (hover || selected)
                                                            ? "fill-amber-400 text-amber-400"
                                                            : "text-slate-200 hover:text-slate-300"
                                                    )} />
                                                </button>
                                            ))}
                                            {(hover || selected) > 0 && (
                                                <span className="ml-2 text-sm font-medium text-slate-600">
                                                    {RATING_LABELS[hover || selected]}
                                                </span>
                                            )}
                                        </div>

                                        {/* Aviso si no ha puntuado */}
                                        {selected === 0 && (
                                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                                                ⭐ Selecciona al menos una estrella para poder enviar tu valoración
                                            </p>
                                        )}

                                        {/* Comentario */}
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500 font-medium">
                                                Comentario{" "}
                                                <span className="font-normal text-slate-400">(opcional)</span>
                                            </label>
                                            <Textarea
                                                placeholder="¿Qué te pareció? ¿Qué mejorarías?"
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                maxLength={300}
                                                rows={3}
                                                className="resize-none text-sm"
                                            />
                                            <p className="text-xs text-slate-400 text-right">
                                                {comment.length}/300
                                            </p>
                                        </div>

                                        <Button
                                            onClick={handleSubmitRating}
                                            disabled={saving || selected === 0}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            {saving ? "Enviando..." : "Enviar valoración"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Aviso si actividad no ha finalizado (para estudiante) */}
                        {isStudent && !isFinalizada && (
                            <div className="border-t pt-3">
                                <p className="text-xs text-slate-400 text-center">
                                    Podrás valorar esta actividad una vez que haya finalizado.
                                </p>
                            </div>
                        )}

                        {/* ── Valoraciones staff ── */}
                        {!isStudent && isFinalizada && (
                            <RatingsPanel activityId={activity.id} />
                        )}

                        {/* Editar (staff) */}
                        {canManage && (
                            <div className="border-t pt-3">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => onEdit(activity)}
                                >
                                    Editar actividad
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmación antes de enviar */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar valoración?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>Vas a enviar la siguiente valoración para <strong>{activity.title}</strong>:</p>
                                <div className="flex gap-0.5 my-1">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <Star key={n} className={cn(
                                            "w-5 h-5",
                                            n <= selected
                                                ? "fill-amber-400 text-amber-400"
                                                : "text-slate-200"
                                        )} />
                                    ))}
                                    <span className="ml-2 text-sm text-slate-600 self-center">
                                        {RATING_LABELS[selected]}
                                    </span>
                                </div>
                                {comment.trim() ? (
                                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border">
                                        "{comment}"
                                    </p>
                                ) : (
                                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                        ⚠️ No agregaste un comentario. ¿Deseas enviar sin comentario?
                                    </p>
                                )}
                                <p className="text-xs text-slate-400 pt-1">
                                    Esta acción no se puede deshacer.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Volver y editar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRating}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            Sí, enviar valoración
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// ─── Activity Card compacta ────────────────────────────────────────────────────
function ActivityCard({
    activity,
    canManage,
    isStudent,
    studentId,
    onEdit,
}: {
    activity: any
    canManage: boolean
    isStudent: boolean
    studentId: string | null
    onEdit: (a: any) => void
}) {
    const [modalOpen, setModalOpen] = useState(false)
    const status = computeStatus(activity.start_datetime, activity.end_datetime)
    const meta = STATUS_META[status as keyof typeof STATUS_META]
    const isFinalizada = status === "finalizada"

    const titleColorId = activity.title_color || "purple"
    const colorStyle = COLOR_MAP[titleColorId] || COLOR_MAP.purple
    const isExterna = activity.origin === "externa"

    const hasUser = !!activity.users
    const creatorName = hasUser ? `${activity.users.name} ${activity.users.last_name || ""}`.trim() : "Administrador"
    const creatorRole = hasUser ? activity.users.role : "admin"
    const roleLabel = ROLE_LABELS[creatorRole] || creatorRole

    const activityCourses = (activity.activity_courses ?? []).map((ac: any) => ac.courses?.name).filter(Boolean)

    return (
        <>
            <button
                onClick={() => setModalOpen(true)}
                className={cn(
                    "flex flex-col bg-white text-left w-full h-full rounded-2xl border shadow-sm border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 group relative overflow-hidden"
                )}
            >
                {/* ── Top Header Area (Neutral bg & Big Icon) ── */}
                <div className="relative w-full h-32 flex items-center justify-center pt-2 bg-slate-100">
                    {/* Status & Origin badges inside the header */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                        <Badge className={cn("text-[10px] px-2 py-0.5 border-none font-semibold", meta.badge)}>
                            {meta.label}
                        </Badge>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm">
                        {isExterna ? <MapPin className="w-3 h-3 text-slate-400" /> : <Pin className="w-3 h-3 text-slate-400" />}
                        {isExterna ? "Externa" : "Del colegio"}
                    </div>

                    {/* Big Abstract Icon */}
                    <div className={cn("transform transition-transform group-hover:scale-105", colorStyle.icon)}>
                        {TYPE_ICONS[activity.activity_type] ? (() => {
                            const IconCard = TYPE_ICONS[activity.activity_type]
                            return <IconCard className="w-16 h-16 drop-shadow-sm opacity-80" strokeWidth={1.5} />
                        })() : <Pin className="w-16 h-16 drop-shadow-sm opacity-80" strokeWidth={1.5} />}
                    </div>

                    {/* Bottom gradient fade for the date text overlay */}
                    <div className="absolute bottom-0 left-0 w-full h-10 bg-linear-to-t from-black/50 to-transparent flex items-end px-3 pb-2">
                        <div className="flex items-center gap-1.5 text-white/90 font-medium text-xs tracking-wide">
                            <Calendar className="w-3.5 h-3.5 opacity-80" />
                            {new Date(activity.start_datetime).toLocaleDateString("es-CL", {
                                day: "numeric", month: "short", year: "numeric",
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Main Content Area ── */}
                <div className="flex-1 flex flex-col w-full p-4 items-start bg-white">
                    <h3 className={cn("font-semibold text-lg leading-snug mb-0.5 line-clamp-1 truncate w-full", colorStyle.text)}>
                        {activity.title}
                    </h3>

                    <div className="text-sm text-slate-500 mb-3 truncate w-full capitalize">
                        {roleLabel}{hasUser ? " " : ""}
                        {hasUser ? (
                            <Link href={`/perfil/${activity.users.id}`} className="hover:underline hover:text-indigo-600 transition-colors">
                                {creatorName}
                            </Link>
                        ) : creatorName}
                    </div>

                    {/* Activity Type / Pills */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {activity.activity_type && (
                            <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-50 rounded-full border border-slate-200 text-slate-600">
                                {TYPE_LABELS[activity.activity_type] || activity.activity_type}
                            </span>
                        )}
                        {creatorRole === "convivencia" || creatorRole === "dupla" ? (
                            <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-50 rounded-full border border-slate-200 text-slate-600">
                                Desarrollo socioemocional
                            </span>
                        ) : null}
                    </div>

                    {/* Espaciador para empujar target a abajo horizontalmente alineado */}
                    <div className="mt-auto pt-3 border-t border-slate-100 w-full flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 truncate">
                            <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            {activity.target === "general" ? (
                                <span className="font-medium">Toda la Institución</span>
                            ) : activity.target === "docentes" ? (
                                <span className="font-medium">Solo Docentes</span>
                            ) : activityCourses.length > 0 ? (
                                <span className="font-medium truncate max-w-[180px]">{activityCourses.join(", ")}</span>
                            ) : (
                                <span className="font-medium">Cursos específicos</span>
                            )}
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
                    </div>
                </div>
            </button>

            {modalOpen && (
                <ActivityModal
                    activity={activity}
                    isStudent={isStudent}
                    studentId={studentId}
                    canManage={canManage}
                    onClose={() => setModalOpen(false)}
                    onEdit={(a) => { setModalOpen(false); onEdit(a) }}
                />
            )}
        </>
    )
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function ActivitiesClient({
    activities: initialActivities,
    courses, userId, studentId, userRole, institutionId, canManage,
}: Props) {
    const [activities, setActivities] = useState(initialActivities)
    const [showForm, setShowForm] = useState(false)
    const [editActivity, setEditActivity] = useState<any | null>(null)
    const [filter, setFilter] = useState<"todas" | "programada" | "en_desarrollo" | "finalizada" | "socioemocional">("todas")

    const isStudent = userRole === "estudiante"

    const handleEdit = (activity: any) => {
        const courseIds = (activity.activity_courses ?? [])
            .map((ac: any) => ac.course_id).filter(Boolean)
        setEditActivity({ ...activity, courseIds })
        setShowForm(true)
    }

    const handleSaved = (saved: any) => {
        setActivities(prev => {
            const exists = prev.find(a => a.id === saved.id)
            return exists
                ? prev.map(a => a.id === saved.id ? saved : a)
                : [saved, ...prev]
        })
    }

    const filtered = useMemo(() => {
        if (filter === "todas") return activities
        if (filter === "socioemocional") return activities.filter(a => a.target === "docentes" || a.activity_type === "socioemocional")
        return activities.filter(a =>
            computeStatus(a.start_datetime, a.end_datetime) === filter
        )
    }, [activities, filter])

    // Agrupar por mes
    const grouped = useMemo(() => {
        const map: Record<string, any[]> = {}
        filtered.forEach(a => {
            const d = new Date(a.start_datetime)
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
            if (!map[key]) map[key] = []
            map[key].push(a)
        })
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, acts]) => {
                const [year, month] = key.split("-").map(Number)
                const label = new Date(year, month, 1).toLocaleDateString("es-CL", {
                    month: "long", year: "numeric",
                })
                return { label, acts }
            })
    }, [filtered])

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Actividades</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Talleres, eventos y actividades de la institución
                    </p>
                </div>
                {canManage && (
                    <Button
                        size="sm"
                        onClick={() => { setEditActivity(null); setShowForm(true) }}
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva actividad
                    </Button>
                )}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 items-center">
                {(["todas", "programada", "en_desarrollo", "finalizada", "socioemocional"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                            filter === f
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        )}
                    >
                        {f === "todas" ? "Todas" : STATUS_META[f]?.label ?? "Socioemocional"}
                    </button>
                ))}
                <span className="text-xs text-slate-400">
                    {filtered.length} actividad{filtered.length !== 1 ? "es" : ""}
                </span>
            </div>

            {/* Lista agrupada por mes */}
            {grouped.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No hay actividades para mostrar.</p>
                </div>
            ) : (
                grouped.map(({ label, acts }) => (
                    <div key={label} className="space-y-3">
                        <h2 className="text-xs font-semibold tracking-widest text-slate-400 capitalize px-1">
                            {label}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {acts.map(activity => (
                                <ActivityCard
                                    key={activity.id}
                                    activity={activity}
                                    canManage={canManage}
                                    isStudent={isStudent}
                                    studentId={studentId}
                                    onEdit={handleEdit}
                                />
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Form modal */}
            {showForm && (
                <ActivityFormModal
                    institutionId={institutionId}
                    userId={userId}
                    courses={courses}
                    editActivity={editActivity}
                    onClose={() => { setShowForm(false); setEditActivity(null) }}
                    onSaved={handleSaved}
                />
            )}
        </div>
    )
}

