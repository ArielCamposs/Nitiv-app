"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import {
    type ActividadSEL,
    type ContenidoInteractivo,
    CARD_PALETTES_MODAL,
} from "@/lib/data/convivencia-sel"
import { Star, CheckCircle2, X, Users, MessageSquare, Loader2, ClipboardList, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface VotoConteo { [letra: string]: number }

interface CursoOpcion {
    id: string
    label: string
}

interface EvaluacionForm {
    participacion: "alta" | "media" | "baja" | null
    calificacion: number
    observaciones: string
    curso_id: string
    curso_nombre: string
}

const PALETA = CARD_PALETTES_MODAL

// ─── BG gradients por eje ────────────────────────────────────────────────────

const BG_GRADIENTES: Record<string, string> = {
    "Autoconciencia":        "from-violet-600 via-purple-500 to-indigo-600",
    "Autoregulación":        "from-blue-600 via-cyan-500 to-sky-600",
    "Habilidades Relacionales": "from-pink-600 via-rose-500 to-fuchsia-600",
    "Conciencia Social":     "from-teal-600 via-emerald-500 to-green-600",
    "Toma de decisiones":    "from-amber-500 via-orange-500 to-yellow-500",
}

// ─── Actividades interactivas en modo PRESENTACIÓN ───────────────────────────

function ActividadEmojis() {
    const EMOCIONES = [
        { emoji: "😊", label: "Contento/a" },
        { emoji: "😢", label: "Triste" },
        { emoji: "😠", label: "Enojado/a" },
        { emoji: "😨", label: "Asustado/a" },
        { emoji: "😴", label: "Cansado/a" },
        { emoji: "😐", label: "Así nomás" },
        { emoji: "🤩", label: "Emocionado/a" },
        { emoji: "😔", label: "Melancólico/a" },
        { emoji: "😅", label: "Nervioso/a" },
        { emoji: "🥰", label: "Con amor" },
    ]
    const [seleccionado, setSeleccionado] = useState<number | null>(null)

    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <p className="sel-font text-center text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                ¿Cuál de estas emociones describe cómo llegaste hoy?
            </p>
            <div className="grid grid-cols-5 gap-4 sm:gap-6 w-full max-w-3xl">
                {EMOCIONES.map((e, i) => (
                    <button
                        key={i}
                        onClick={() => setSeleccionado(i === seleccionado ? null : i)}
                        className={cn(
                            "flex flex-col items-center gap-2 rounded-3xl p-4 sm:p-5 transition-all duration-200 border-3",
                            seleccionado === i
                                ? "bg-white scale-110 shadow-2xl border-white"
                                : "bg-white/20 border-white/30 hover:bg-white/35 hover:scale-105 backdrop-blur-sm"
                        )}
                    >
                        <span className="text-5xl sm:text-6xl leading-none">{e.emoji}</span>
                        <span className={cn(
                            "sel-font text-xs sm:text-sm font-black text-center leading-tight",
                            seleccionado === i ? "text-slate-800" : "text-white"
                        )}>
                            {e.label}
                        </span>
                    </button>
                ))}
            </div>
            {seleccionado !== null && (
                <div className="sel-font text-center text-xl font-black text-white bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/30">
                    ✨ {EMOCIONES[seleccionado].emoji} {EMOCIONES[seleccionado].label}
                </div>
            )}
        </div>
    )
}

function ActividadColores() {
    const COLORES = [
        { color: "#EF4444", nombre: "Rojo", emocion: "Enojo / pasión" },
        { color: "#F97316", nombre: "Naranja", emocion: "Energía / alegría" },
        { color: "#EAB308", nombre: "Amarillo", emocion: "Felicidad / sol" },
        { color: "#22C55E", nombre: "Verde", emocion: "Tranquilidad" },
        { color: "#3B82F6", nombre: "Azul", emocion: "Calma / tristeza" },
        { color: "#8B5CF6", nombre: "Violeta", emocion: "Misterio / creatividad" },
        { color: "#EC4899", nombre: "Rosado", emocion: "Amor / ternura" },
        { color: "#6B7280", nombre: "Gris", emocion: "Neutral / cansancio" },
    ]
    const [seleccionado, setSeleccionado] = useState<number | null>(null)

    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <p className="sel-font text-center text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                ¿Qué color representa cómo te sientes hoy?
            </p>
            <div className="grid grid-cols-4 gap-4 sm:gap-6 w-full max-w-2xl">
                {COLORES.map((c, i) => (
                    <button
                        key={i}
                        onClick={() => setSeleccionado(i === seleccionado ? null : i)}
                        className={cn(
                            "flex flex-col items-center gap-3 rounded-3xl p-4 sm:p-5 transition-all duration-200 border-2",
                            seleccionado === i
                                ? "bg-white scale-110 shadow-2xl"
                                : "bg-white/20 border-white/30 hover:bg-white/35 hover:scale-105 backdrop-blur-sm"
                        )}
                        style={{ borderColor: seleccionado === i ? c.color : undefined }}
                    >
                        <div
                            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-lg"
                            style={{ backgroundColor: c.color }}
                        />
                        <div>
                            <p className={cn("sel-font text-sm font-black text-center", seleccionado === i ? "text-slate-800" : "text-white")}>
                                {c.nombre}
                            </p>
                            <p className={cn("sel-font text-[10px] text-center", seleccionado === i ? "text-slate-500" : "text-white/70")}>
                                {c.emocion}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
            {seleccionado !== null && (
                <div className="sel-font text-center text-xl font-black text-white bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/30">
                    🎨 Mi color de hoy:{" "}
                    <span style={{ color: COLORES[seleccionado].color }} className="drop-shadow-md">
                        {COLORES[seleccionado].nombre}
                    </span>
                </div>
            )}
        </div>
    )
}

function ActividadSemaforo() {
    const [activo, setActivo] = useState<"rojo" | "amarillo" | "verde" | null>(null)
    const OPCIONES = [
        { id: "rojo" as const, color: "#EF4444", glow: "rgba(239,68,68,0.6)", label: "🔴 Rojo", desc: "Muy enojado/a o asustado/a" },
        { id: "amarillo" as const, color: "#EAB308", glow: "rgba(234,179,8,0.6)", label: "🟡 Amarillo", desc: "Un poco nervioso/a" },
        { id: "verde" as const, color: "#22C55E", glow: "rgba(34,197,94,0.6)", label: "🟢 Verde", desc: "Tranquilo/a y listo/a" },
    ]

    return (
        <div className="flex flex-col items-center gap-10 w-full">
            <p className="sel-font text-center text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                ¿En qué color del semáforo estás hoy?
            </p>
            <div className="flex items-center gap-12 sm:gap-20">
                {/* Semáforo grande */}
                <div className="bg-slate-900/80 rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-center gap-5 shadow-2xl border-4 border-slate-700 backdrop-blur-sm">
                    {OPCIONES.map((o) => (
                        <button
                            key={o.id}
                            onClick={() => setActivo(activo === o.id ? null : o.id)}
                            className="rounded-full transition-all duration-300 focus:outline-none"
                            style={{
                                width: 90, height: 90,
                                backgroundColor: activo === o.id ? o.color : o.color + "30",
                                boxShadow: activo === o.id ? `0 0 50px 15px ${o.glow}` : "none",
                                transform: activo === o.id ? "scale(1.15)" : "scale(1)",
                            }}
                        />
                    ))}
                </div>

                {/* Opciones */}
                <div className="flex flex-col gap-4">
                    {OPCIONES.map((o) => (
                        <button
                            key={o.id}
                            onClick={() => setActivo(activo === o.id ? null : o.id)}
                            className={cn(
                                "sel-font flex items-center gap-4 rounded-2xl px-6 py-4 text-left transition-all duration-200 border-2",
                                activo === o.id
                                    ? "bg-white/30 border-white scale-105 shadow-xl"
                                    : "bg-white/10 border-white/20 hover:bg-white/20"
                            )}
                        >
                            <span className="text-3xl">{o.label.split(" ")[0]}</span>
                            <div>
                                <p className="text-lg font-black text-white">{o.label.replace(/^[^\s]+\s/, "")}</p>
                                <p className="text-sm text-white/80">{o.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ActividadCuerpo() {
    const EMOCIONES_CUERPO = [
        { nombre: "Enojo", color: "#EF4444", emoji: "😠" },
        { nombre: "Alegría", color: "#EAB308", emoji: "😊" },
        { nombre: "Miedo", color: "#8B5CF6", emoji: "😨" },
        { nombre: "Tristeza", color: "#3B82F6", emoji: "😢" },
    ]
    const [emocionActiva, setEmocionActiva] = useState("Enojo")
    const activa = EMOCIONES_CUERPO.find(e => e.nombre === emocionActiva)!

    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <p className="sel-font text-center text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                ¿Dónde sientes esta emoción en tu cuerpo?
            </p>
            <div className="flex items-center gap-10 sm:gap-16">
                {/* Selector de emoción */}
                <div className="flex flex-col gap-3">
                    {EMOCIONES_CUERPO.map((em) => (
                        <button
                            key={em.nombre}
                            onClick={() => setEmocionActiva(em.nombre)}
                            className={cn(
                                "sel-font flex items-center gap-3 rounded-2xl px-5 py-3 text-base font-black border-2 transition-all duration-200",
                                emocionActiva === em.nombre
                                    ? "bg-white scale-105 shadow-xl border-white text-slate-800"
                                    : "bg-white/15 border-white/25 text-white hover:bg-white/25"
                            )}
                        >
                            <span className="text-2xl">{em.emoji}</span>
                            {em.nombre}
                        </button>
                    ))}
                </div>

                {/* Cuerpo SVG */}
                <div className="relative">
                    <svg
                        viewBox="0 0 200 400"
                        className="w-40 sm:w-52 drop-shadow-2xl"
                    >
                        <circle cx="100" cy="45" r="35" fill="#FDE68A" stroke="#D97706" strokeWidth="3" />
                        <circle cx="88" cy="40" r="5" fill="#1E293B" />
                        <circle cx="112" cy="40" r="5" fill="#1E293B" />
                        <path d="M 88 56 Q 100 65 112 56" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        <rect x="65" y="85" width="70" height="110" rx="14" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="3" />
                        <rect x="28" y="90" width="35" height="22" rx="11" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="2.5" />
                        <rect x="137" y="90" width="35" height="22" rx="11" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="2.5" />
                        <rect x="68" y="200" width="28" height="80" rx="12" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="2.5" />
                        <rect x="104" y="200" width="28" height="80" rx="12" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="2.5" />
                        <rect x="88" y="79" width="24" height="12" rx="4" fill="#FDE68A" stroke="#D97706" strokeWidth="2" />
                        <text x="100" y="148" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1E3A5F">
                            Dibuja en tu
                        </text>
                        <text x="100" y="163" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1E3A5F">
                            cuaderno ✏️
                        </text>
                    </svg>
                </div>
            </div>
            <div className="sel-font text-center text-lg font-bold text-white bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/30 max-w-md">
                {activa.emoji} Marca en tu cuaderno dónde sientes <strong>{activa.nombre}</strong>
            </div>
        </div>
    )
}

function ActividadRespiracion() {
    const [fase, setFase] = useState<"inhala" | "exhala" | "pausa">("inhala")
    const [activo, setActivo] = useState(false)
    const [ronda, setRonda] = useState(0)
    const [tamano, setTamano] = useState(120)
    const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const MAX_RONDAS = 3
    const DURACION_MS = 4000

    useEffect(() => {
        if (!activo) return
        if (ronda >= MAX_RONDAS) {
            setActivo(false)
            setFase("inhala")
            setTamano(120)
            return
        }
        setFase("inhala")
        setTamano(240)
        intervalRef.current = setTimeout(() => {
            setFase("pausa")
            intervalRef.current = setTimeout(() => {
                setFase("exhala")
                setTamano(120)
                intervalRef.current = setTimeout(() => {
                    setRonda((r) => r + 1)
                }, DURACION_MS)
            }, 500)
        }, DURACION_MS)
        return () => { if (intervalRef.current) clearTimeout(intervalRef.current) }
    }, [activo, ronda])

    const handleToggle = () => {
        if (activo) {
            setActivo(false); setFase("inhala"); setTamano(120); setRonda(0)
            if (intervalRef.current) clearTimeout(intervalRef.current)
        } else {
            setRonda(0); setActivo(true)
        }
    }

    const faseLabel = { inhala: "Inhala... 🌬️", exhala: "Exhala... 💨", pausa: "Sostén..." }
    const terminado = ronda >= MAX_RONDAS && !activo

    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <p className="sel-font text-center text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                Respiración de globo — sigue el ritmo
            </p>

            <div className="relative flex items-center justify-center" style={{ height: 280, width: 280 }}>
                <div
                    className="rounded-full flex items-center justify-center transition-all ease-in-out"
                    style={{
                        width: tamano, height: tamano,
                        background: "radial-gradient(circle at 35% 35%, #e0f2fe, #38bdf8, #0284c7)",
                        boxShadow: activo ? "0 0 80px 20px rgba(56,189,248,0.4)" : "0 0 40px rgba(56,189,248,0.25)",
                        transitionDuration: fase === "pausa" ? "200ms" : `${DURACION_MS}ms`,
                    }}
                >
                    <span className="text-6xl sm:text-7xl select-none">🎈</span>
                </div>
            </div>

            {activo && (
                <p className="sel-font text-3xl font-black text-white animate-pulse">
                    {faseLabel[fase]}
                </p>
            )}
            {activo && (
                <p className="sel-font text-lg text-white/70 font-bold">
                    Ronda {Math.min(ronda + 1, MAX_RONDAS)} de {MAX_RONDAS}
                </p>
            )}
            {terminado && (
                <p className="sel-font text-2xl font-black text-white">
                    ✅ ¡Listo! ¿Cómo se sienten ahora?
                </p>
            )}

            <button
                onClick={handleToggle}
                className={cn(
                    "sel-font rounded-3xl px-12 py-5 text-xl font-black transition-all duration-200 shadow-xl",
                    activo
                        ? "bg-white/20 text-white border-2 border-white/40 hover:bg-white/30"
                        : "bg-white text-sky-600 hover:scale-105 active:scale-95"
                )}
            >
                {activo ? "⏹ Detener" : terminado ? "🔄 Repetir" : "▶ Iniciar"}
            </button>
        </div>
    )
}

function ActividadVinetas() {
    const VINETAS = [
        { emoji: "😟", situacion: "Ana llega al colegio y ningún amigo la saluda.", pregunta: "¿Cómo crees que se siente Ana?" },
        { emoji: "🤩", situacion: "Pedro ganó el concurso de dibujo y sus compañeros aplauden.", pregunta: "¿Qué siente Pedro en este momento?" },
        { emoji: "😤", situacion: "Sofía prestó su lápiz y no se lo devolvieron.", pregunta: "¿Qué emoción puede sentir Sofía?" },
    ]
    const [vinetaActiva, setVinetaActiva] = useState(0)

    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <p className="sel-font text-center text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                ¿Cómo se siente este personaje?
            </p>

            {/* Viñeta */}
            <div className="w-full max-w-2xl rounded-3xl bg-white/15 backdrop-blur-sm border-2 border-white/30 p-8 sm:p-10 space-y-5">
                <div className="flex items-center gap-6">
                    <span className="text-7xl sm:text-8xl shrink-0">{VINETAS[vinetaActiva].emoji}</span>
                    <div className="space-y-3">
                        <p className="sel-font text-xl sm:text-2xl font-bold text-white leading-snug">
                            {VINETAS[vinetaActiva].situacion}
                        </p>
                        <p className="sel-font text-lg sm:text-xl font-black text-white/80 italic">
                            {VINETAS[vinetaActiva].pregunta}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navegación */}
            <div className="flex items-center gap-4">
                {VINETAS.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setVinetaActiva(i)}
                        className={cn(
                            "sel-font h-12 w-12 rounded-2xl text-base font-black transition-all duration-200",
                            vinetaActiva === i
                                ? "bg-white text-slate-800 scale-110 shadow-xl"
                                : "bg-white/20 text-white hover:bg-white/35"
                        )}
                    >
                        {i + 1}
                    </button>
                ))}
                {vinetaActiva < VINETAS.length - 1 && (
                    <button
                        onClick={() => setVinetaActiva(vinetaActiva + 1)}
                        className="sel-font ml-2 rounded-2xl bg-white/20 px-6 py-3 text-base font-black text-white hover:bg-white/35 transition-all"
                    >
                        Siguiente →
                    </button>
                )}
            </div>
        </div>
    )
}

function ActividadVotacion({ opciones }: { opciones: NonNullable<ContenidoInteractivo["opciones"]> }) {
    const [votos, setVotos] = useState<VotoConteo>({})
    const totalVotos = Object.values(votos).reduce((a, b) => a + b, 0)

    const LETRAS_BG: Record<string, string> = {
        A: "from-violet-500 to-purple-500",
        B: "from-blue-500 to-cyan-500",
        C: "from-amber-500 to-orange-500",
        D: "from-rose-500 to-pink-500",
    }

    const agregarVoto = (letra: string) => setVotos((p) => ({ ...p, [letra]: (p[letra] ?? 0) + 1 }))
    const quitarVoto = (letra: string) => setVotos((p) => {
        const n = { ...p }
        if ((n[letra] ?? 0) > 0) n[letra]--
        return n
    })

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
            <div className="flex items-center justify-between w-full">
                <p className="sel-font text-2xl font-black text-white">Votación del curso</p>
                <span className="sel-font rounded-full bg-white/20 px-5 py-2 text-base font-black text-white border border-white/30">
                    {totalVotos} votos
                </span>
            </div>

            <div className="space-y-3 w-full">
                {opciones.map((op) => {
                    const v = votos[op.letra] ?? 0
                    const pct = totalVotos > 0 ? (v / totalVotos) * 100 : 0
                    return (
                        <div key={op.letra} className="rounded-3xl overflow-hidden border-2 border-white/20">
                            <div className="relative bg-white/10 backdrop-blur-sm">
                                <div
                                    className={cn("absolute inset-y-0 left-0 opacity-30 bg-gradient-to-r transition-all duration-700", LETRAS_BG[op.letra])}
                                    style={{ width: `${pct}%` }}
                                />
                                <div className="relative flex items-center gap-4 px-5 py-4">
                                    <span className={cn(
                                        "sel-font shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-black text-white bg-gradient-to-br shadow-lg",
                                        LETRAS_BG[op.letra]
                                    )}>
                                        {op.letra}
                                    </span>
                                    <p className="sel-font flex-1 text-lg font-bold text-white leading-snug">
                                        {op.texto}
                                    </p>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => quitarVoto(op.letra)}
                                            disabled={v === 0}
                                            className="h-10 w-10 rounded-xl bg-white/20 text-white font-black text-xl hover:bg-white/35 disabled:opacity-30 transition-all"
                                        >
                                            −
                                        </button>
                                        <span className="sel-font w-10 text-center text-xl font-black text-white">
                                            {v}
                                        </span>
                                        <button
                                            onClick={() => agregarVoto(op.letra)}
                                            className={cn(
                                                "h-10 w-10 rounded-xl text-white font-black text-xl transition-all hover:scale-110 active:scale-95 bg-gradient-to-br shadow-md",
                                                LETRAS_BG[op.letra]
                                            )}
                                        >
                                            +
                                        </button>
                                    </div>
                                    {totalVotos > 0 && (
                                        <span className="sel-font w-12 text-right text-base font-black text-white/70">
                                            {Math.round(pct)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function ActividadFrases({ frases }: { frases: NonNullable<ContenidoInteractivo["frasesComparativas"]> }) {
    const [activa, setActiva] = useState(0)

    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <p className="sel-font text-center text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                Compara estas dos formas de decir lo mismo
            </p>

            <div className="grid grid-cols-2 gap-5 w-full max-w-3xl">
                <div className="rounded-3xl bg-red-500/20 border-2 border-red-300/40 backdrop-blur-sm p-6 sm:p-8 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-3xl">❌</span>
                        <p className="sel-font text-sm font-black text-red-200 uppercase tracking-widest">
                            Acusación
                        </p>
                    </div>
                    <p className="sel-font text-2xl sm:text-3xl font-black text-white leading-snug">
                        &ldquo;{frases[activa].incorrecta}&rdquo;
                    </p>
                </div>
                <div className="rounded-3xl bg-emerald-500/20 border-2 border-emerald-300/40 backdrop-blur-sm p-6 sm:p-8 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-3xl">✅</span>
                        <p className="sel-font text-sm font-black text-emerald-200 uppercase tracking-widest">
                            Mensaje yo
                        </p>
                    </div>
                    <p className="sel-font text-2xl sm:text-3xl font-black text-white leading-snug">
                        &ldquo;{frases[activa].correcta}&rdquo;
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {frases.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActiva(i)}
                        className={cn(
                            "sel-font rounded-2xl px-5 py-2.5 text-base font-black transition-all duration-200",
                            activa === i
                                ? "bg-white text-slate-800 scale-105 shadow-xl"
                                : "bg-white/20 text-white hover:bg-white/35"
                        )}
                    >
                        Ejemplo {i + 1}
                    </button>
                ))}
            </div>
        </div>
    )
}

// ─── Render de contenido interactivo ─────────────────────────────────────────

function ContenidoInteractivoRender({ interactivo }: { interactivo: ContenidoInteractivo }) {
    switch (interactivo.tipo) {
        case "emojis":      return <ActividadEmojis />
        case "colores":     return <ActividadColores />
        case "semaforo":    return <ActividadSemaforo />
        case "cuerpo":      return <ActividadCuerpo />
        case "respiracion": return <ActividadRespiracion />
        case "vinetas":     return <ActividadVinetas />
        case "votacion":    return <ActividadVotacion opciones={interactivo.opciones ?? []} />
        case "frases":      return <ActividadFrases frases={interactivo.frasesComparativas ?? []} />
        default:            return null
    }
}

// ─── Panel de evaluación (privado, para el docente) ───────────────────────────

function PanelEvaluacion({
    actividad,
    ciclo,
    onGuardado,
    onCancelar,
}: {
    actividad: ActividadSEL
    ciclo: string
    onGuardado: () => void
    onCancelar: () => void
}) {
    const [form, setForm] = useState<EvaluacionForm>({
        participacion: null,
        calificacion: 0,
        observaciones: "",
        curso_id: "",
        curso_nombre: "",
    })
    const [cursos, setCursos] = useState<CursoOpcion[]>([])
    const [cargandoCursos, setCargandoCursos] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const PARTICIPACION_OPTS = [
        { id: "alta" as const, label: "Alta", emoji: "🙌" },
        { id: "media" as const, label: "Media", emoji: "👍" },
        { id: "baja" as const, label: "Baja", emoji: "😐" },
    ]

    useEffect(() => {
        const cargarCursos = async () => {
            setCargandoCursos(true)
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data: userData } = await supabase
                    .from("users")
                    .select("institution_id")
                    .eq("id", user.id)
                    .single()
                if (!userData?.institution_id) return
                const { data } = await supabase
                    .from("courses")
                    .select("id, name, section")
                    .eq("institution_id", userData.institution_id)
                    .eq("active", true)
                    .order("name")
                if (data) {
                    setCursos(data.map(c => ({
                        id: c.id,
                        label: [c.name, c.section].filter(Boolean).join(" ").trim(),
                    })))
                }
            } finally {
                setCargandoCursos(false)
            }
        }
        cargarCursos()
    }, [])

    const handleCursoChange = (id: string) => {
        const curso = cursos.find(c => c.id === id)
        setForm(f => ({ ...f, curso_id: id, curso_nombre: curso?.label ?? "" }))
    }

    const handleGuardar = async () => {
        if (!form.participacion || form.calificacion === 0) {
            setError("Por favor completa la participación y la calificación.")
            return
        }
        setGuardando(true)
        setError(null)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No hay sesión activa.")
            const { data: userData } = await supabase
                .from("users")
                .select("institution_id")
                .eq("id", user.id)
                .single()
            if (!userData?.institution_id) throw new Error("No se encontró institución.")
            const { error: insertError } = await supabase.from("sel_actividad_registros").insert({
                created_by: user.id,
                institution_id: userData.institution_id,
                actividad_id: actividad.id,
                actividad_nombre: actividad.nombre,
                ciclo,
                eje_casel: actividad.ejeCasel,
                tipo: actividad.tipo,
                participacion: form.participacion,
                calificacion: form.calificacion,
                observaciones: form.observaciones || null,
                curso_id: form.curso_id || null,
                curso_nombre: form.curso_nombre || null,
                realizada_en: new Date().toISOString(),
            })
            if (insertError) throw insertError
            onGuardado()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error al guardar.")
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className="space-y-5">
            <div className="text-center">
                <h3 className="sel-font text-xl font-black text-slate-800">Evaluar actividad</h3>
                <p className="sel-font text-sm text-slate-500 font-semibold mt-1">
                    Registro privado — visible para ti, tu dupla y convivencia
                </p>
            </div>

            {/* Selector de curso */}
            <div className="space-y-2">
                <p className="sel-font text-xs font-black text-slate-400 uppercase tracking-widest">
                    Curso <span className="normal-case font-semibold">(opcional)</span>
                </p>
                <div className="relative">
                    <select
                        value={form.curso_id}
                        onChange={(e) => handleCursoChange(e.target.value)}
                        disabled={cargandoCursos}
                        className="sel-font w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white pl-4 pr-10 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-300 disabled:opacity-50 cursor-pointer"
                    >
                        <option value="">
                            {cargandoCursos ? "Cargando cursos..." : "— Sin especificar —"}
                        </option>
                        {cursos.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
            </div>

            {/* Participación */}
            <div className="space-y-2">
                <p className="sel-font text-xs font-black text-slate-400 uppercase tracking-widest">Participación</p>
                <div className="grid grid-cols-3 gap-2">
                    {PARTICIPACION_OPTS.map((op) => (
                        <button
                            key={op.id}
                            onClick={() => setForm((f) => ({ ...f, participacion: op.id }))}
                            className={cn(
                                "sel-font flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-sm font-black transition-all",
                                form.participacion === op.id
                                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 scale-105"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                            )}
                        >
                            <span className="text-2xl">{op.emoji}</span>
                            {op.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calificación */}
            <div className="space-y-2">
                <p className="sel-font text-xs font-black text-slate-400 uppercase tracking-widest">Calificación de la actividad</p>
                <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setForm((f) => ({ ...f, calificacion: n }))} className="transition-all hover:scale-110">
                            <Star className={cn("h-9 w-9", n <= form.calificacion ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                        </button>
                    ))}
                </div>
                {form.calificacion > 0 && (
                    <p className="sel-font text-center text-xs font-bold text-amber-600">
                        {["", "Muy baja", "Baja", "Regular", "Buena", "¡Excelente!"][form.calificacion]}
                    </p>
                )}
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
                <p className="sel-font text-xs font-black text-slate-400 uppercase tracking-widest">
                    Observaciones <span className="normal-case font-semibold">(opcional)</span>
                </p>
                <textarea
                    value={form.observaciones}
                    onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                    placeholder="¿Cómo respondió el curso? ¿Algo a mejorar?"
                    rows={3}
                    className="sel-font w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 placeholder-slate-300 focus:outline-none focus:border-indigo-300 resize-none"
                />
            </div>

            {error && (
                <p className="sel-font text-xs font-bold text-red-600 bg-red-50 rounded-xl px-3 py-2">
                    ⚠️ {error}
                </p>
            )}

            <div className="flex gap-3">
                <button
                    onClick={onCancelar}
                    className="sel-font flex-1 rounded-2xl border-2 border-slate-200 py-3 text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="sel-font flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-black text-white shadow-md hover:from-indigo-600 hover:to-violet-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {guardando ? "Guardando..." : "Guardar registro"}
                </button>
            </div>
        </div>
    )
}

// ─── Modal pantalla completa de presentación ──────────────────────────────────

interface Props {
    actividad: ActividadSEL
    ciclo: string
    onCerrar: () => void
}

export function ActividadSELModal({ actividad, ciclo, onCerrar }: Props) {
    const [fase, setFase] = useState<"actividad" | "evaluacion" | "guardado">("actividad")
    const [mostrarEval, setMostrarEval] = useState(false)
    const gradiente = BG_GRADIENTES[actividad.ejeCasel] ?? "from-indigo-600 via-violet-500 to-purple-600"
    const p = PALETA[actividad.ejeCasel]

    useEffect(() => {
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = "" }
    }, [])

    return (
        <div className={cn(
            "fixed inset-0 z-[200] flex flex-col bg-gradient-to-br",
            gradiente
        )}>
            {/* Burbujas decorativas de fondo */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute top-1/2 left-1/4 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-4 border-b border-white/20">
                <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                        "sel-font shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg",
                        p.numBg, p.numText
                    )}>
                        {actividad.numero}
                    </span>
                    <div className="min-w-0">
                        {actividad.mes && (
                            <p className="sel-font text-xs font-black uppercase tracking-widest text-white/60 mb-0.5">
                                {actividad.mes}
                            </p>
                        )}
                        <h2 className="sel-font text-lg sm:text-xl font-black text-white leading-snug truncate">
                            {actividad.nombre}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Botón Finalizar — para el docente, discreto */}
                    <button
                        onClick={() => setMostrarEval(true)}
                        title="Finalizar y evaluar actividad"
                        className="sel-font flex items-center gap-2 rounded-2xl bg-white/15 border border-white/30 px-4 py-2 text-xs font-black text-white hover:bg-white/25 transition-all backdrop-blur-sm"
                    >
                        <ClipboardList className="h-4 w-4" />
                        <span className="hidden sm:inline">Finalizar y evaluar</span>
                    </button>
                    <button
                        onClick={onCerrar}
                        className="h-10 w-10 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center hover:bg-white/25 transition-colors backdrop-blur-sm"
                    >
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>
            </div>

            {/* Contenido principal - centro de la pantalla */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-6 overflow-y-auto">
                {actividad.interactivo ? (
                    <ContenidoInteractivoRender interactivo={actividad.interactivo} />
                ) : (
                    <p className="sel-font text-center text-2xl font-bold text-white max-w-2xl leading-relaxed">
                        {actividad.desarrollo}
                    </p>
                )}
            </div>

            {/* Moraleja al pie */}
            <div className="relative z-10 border-t border-white/20 px-6 sm:px-10 py-4">
                <p className="sel-font text-center text-base sm:text-lg font-bold italic text-white/80">
                    {actividad.moraleja}
                </p>
            </div>

            {/* ── Panel de evaluación — overlay encima ── */}
            {mostrarEval && (
                <div
                    className="fixed inset-0 z-[210] flex items-center justify-center p-4"
                    style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(12px)" }}
                >
                    {fase === "guardado" ? (
                        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl text-center space-y-5">
                            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="sel-font text-xl font-black text-slate-800">¡Registro guardado!</h3>
                                <p className="sel-font text-sm text-slate-500 font-semibold mt-2">
                                    Disponible en Estadísticas SEL para ti, tu dupla y convivencia.
                                </p>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <div className="sel-font flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-600">
                                    <Users className="h-3 w-3" /> Visible para tu institución
                                </div>
                                <div className="sel-font flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-600">
                                    <MessageSquare className="h-3 w-3" /> En Estadísticas SEL
                                </div>
                            </div>
                            <button
                                onClick={onCerrar}
                                className="sel-font w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-black text-white shadow-md hover:scale-105 transition-all"
                            >
                                Cerrar presentación
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                            <PanelEvaluacion
                                actividad={actividad}
                                ciclo={ciclo}
                                onGuardado={() => setFase("guardado")}
                                onCancelar={() => setMostrarEval(false)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
