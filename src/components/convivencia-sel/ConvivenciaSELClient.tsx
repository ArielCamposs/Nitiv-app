"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    CICLOS,
    EJES_CASEL,
    COLORES_CASEL,
    COLORES_TIPO,
    ACTIVIDADES_CICLO1,
    type Ciclo,
    type EjeCasel,
    type TipoActividad,
    type ActividadSEL,
} from "@/lib/data/convivencia-sel"
import { cn } from "@/lib/utils"
import { BookOpen, ChevronDown, ChevronUp, LogOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SELSplashScreen } from "./SELSplashScreen"

const ACTIVIDADES_POR_CICLO: Record<Ciclo, ActividadSEL[]> = {
    ciclo1: ACTIVIDADES_CICLO1,
    ciclo2: [],
    ciclo3: [],
}

const TIPOS: TipoActividad[] = ["Reflexión", "Dilema", "Regulación"]

// Fondo de cada tarjeta según el eje (pastel vivo)
const CARD_PALETTES: Record<EjeCasel, {
    cardBg: string
    headerBg: string
    numBg: string
    numText: string
    shadow: string
    quoteColor: string
    toggleBg: string
    consejoBg: string
    consejoText: string
    consejoBorder: string
}> = {
    "Autoconciencia": {
        cardBg: "bg-violet-50",
        headerBg: "bg-violet-100",
        numBg: "bg-violet-500",
        numText: "text-white",
        shadow: "0 8px 32px rgba(139,92,246,0.22)",
        quoteColor: "text-violet-600",
        toggleBg: "hover:bg-violet-100/60",
        consejoBg: "bg-violet-50",
        consejoText: "text-violet-800",
        consejoBorder: "border-violet-200",
    },
    "Autoregulación": {
        cardBg: "bg-blue-50",
        headerBg: "bg-blue-100",
        numBg: "bg-blue-500",
        numText: "text-white",
        shadow: "0 8px 32px rgba(59,130,246,0.22)",
        quoteColor: "text-blue-600",
        toggleBg: "hover:bg-blue-100/60",
        consejoBg: "bg-blue-50",
        consejoText: "text-blue-800",
        consejoBorder: "border-blue-200",
    },
    "Habilidades Relacionales": {
        cardBg: "bg-pink-50",
        headerBg: "bg-pink-100",
        numBg: "bg-pink-500",
        numText: "text-white",
        shadow: "0 8px 32px rgba(236,72,153,0.22)",
        quoteColor: "text-pink-600",
        toggleBg: "hover:bg-pink-100/60",
        consejoBg: "bg-pink-50",
        consejoText: "text-pink-800",
        consejoBorder: "border-pink-200",
    },
    "Conciencia Social": {
        cardBg: "bg-teal-50",
        headerBg: "bg-teal-100",
        numBg: "bg-teal-500",
        numText: "text-white",
        shadow: "0 8px 32px rgba(20,184,166,0.22)",
        quoteColor: "text-teal-600",
        toggleBg: "hover:bg-teal-100/60",
        consejoBg: "bg-teal-50",
        consejoText: "text-teal-800",
        consejoBorder: "border-teal-200",
    },
    "Toma de decisiones": {
        cardBg: "bg-amber-50",
        headerBg: "bg-amber-100",
        numBg: "bg-amber-500",
        numText: "text-white",
        shadow: "0 8px 32px rgba(245,158,11,0.22)",
        quoteColor: "text-amber-600",
        toggleBg: "hover:bg-amber-100/60",
        consejoBg: "bg-amber-50",
        consejoText: "text-amber-800",
        consejoBorder: "border-amber-200",
    },
}

const BG_SHAPES = [
    { size: 320, top: "-8%",  left: "-5%",  color: "#e0e7ff", dur: "9s",  delay: "0s"   },
    { size: 240, top: "68%",  left: "78%",  color: "#fce7f3", dur: "11s", delay: "1s"   },
    { size: 180, top: "78%",  left: "-3%",  color: "#d1fae5", dur: "8s",  delay: "0.5s" },
    { size: 160, top: "-5%",  left: "76%",  color: "#fef3c7", dur: "10s", delay: "2s"   },
    { size: 120, top: "42%",  left: "90%",  color: "#ddd6fe", dur: "7s",  delay: "1.5s" },
    { size: 90,  top: "30%",  left: "-2%",  color: "#bfdbfe", dur: "12s", delay: "0.8s" },
]

function EjeBadge({ eje }: { eje: EjeCasel }) {
    const c = COLORES_CASEL[eje]
    return (
        <span className={cn(
            "sel-font inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border",
            c.bg, c.text, c.border
        )}>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", c.dot)} />
            {eje}
        </span>
    )
}

function TipoBadge({ tipo }: { tipo: TipoActividad }) {
    const c = COLORES_TIPO[tipo]
    return (
        <span className={cn("sel-font inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", c.bg, c.text)}>
            {tipo}
        </span>
    )
}

function ActividadCard({ actividad, index }: { actividad: ActividadSEL; index: number }) {
    const [expanded, setExpanded] = useState(false)
    const [visible, setVisible] = useState(false)
    const p = CARD_PALETTES[actividad.ejeCasel]

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 60 + index * 80)
        return () => clearTimeout(t)
    }, [index])

    return (
        <div
            className={cn(
                "rounded-3xl overflow-hidden transition-all duration-500",
                p.cardBg,
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ boxShadow: visible ? p.shadow : "none", transitionDelay: `${index * 40}ms` }}
        >
            {/* Header coloreado */}
            <div className={cn("px-5 pt-4 pb-3", p.headerBg)}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn(
                            "sel-font shrink-0 h-9 w-9 rounded-2xl flex items-center justify-center text-sm font-black shadow-sm",
                            p.numBg, p.numText
                        )}>
                            {actividad.numero}
                        </span>
                        <div className="min-w-0">
                            {actividad.mes && (
                                <p className="sel-font text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">
                                    {actividad.mes}
                                </p>
                            )}
                            <h3 className="sel-font text-sm font-black text-slate-800 leading-snug">
                                {actividad.nombre}
                            </h3>
                        </div>
                    </div>
                    <TipoBadge tipo={actividad.tipo} />
                </div>
                <div className="mt-2.5">
                    <EjeBadge eje={actividad.ejeCasel} />
                </div>
            </div>

            {/* Cuerpo */}
            <div className="px-5 py-4">
                <p className="sel-font text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {actividad.desarrollo}
                </p>

                <blockquote className={cn(
                    "sel-font mt-3 border-l-4 rounded-r-xl pl-3 pr-2 py-1.5 text-sm font-bold italic leading-snug",
                    p.consejoBorder, p.quoteColor,
                    p.cardBg.replace("50", "100/60")
                )}>
                    {actividad.moraleja}
                </blockquote>
            </div>

            {/* Toggle consejo */}
            <div className={cn("border-t-2 border-white/60")}>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={cn(
                        "sel-font w-full flex items-center justify-between gap-2 px-5 py-3 text-xs font-bold",
                        "text-slate-500 transition-colors duration-200",
                        p.toggleBg
                    )}
                >
                    <span>💡 Consejo guiado para el docente</span>
                    <span className={cn(
                        "transition-transform duration-300",
                        expanded ? "rotate-180" : "rotate-0"
                    )}>
                        <ChevronDown className="h-4 w-4" />
                    </span>
                </button>

                <div className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}>
                    <div className="min-h-0 overflow-hidden">
                        <div className="px-5 pb-4 pt-1">
                            <div className={cn(
                                "sel-font rounded-2xl border-2 px-4 py-3 text-sm leading-relaxed font-medium",
                                p.consejoBg, p.consejoText, p.consejoBorder
                            )}>
                                {actividad.consejoGuiado}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface Props {
    homeHref: string
}

export function ConvivenciaSELClient({ homeHref }: Props) {
    const router = useRouter()
    const [splashDone, setSplashDone]               = useState(false)
    const [exiting, setExiting]                     = useState(false)
    const [cicloSeleccionado, setCicloSeleccionado] = useState<Ciclo>("ciclo1")
    const [ejeSeleccionado, setEjeSeleccionado]     = useState<EjeCasel | "todos">("todos")
    const [mesSeleccionado, setMesSeleccionado]     = useState<string>("todos")
    const [tipoSeleccionado, setTipoSeleccionado]   = useState<TipoActividad | "todos">("todos")

    const handleSplashEnter = (eje: EjeCasel | "todos") => {
        if (eje !== "todos") setEjeSeleccionado(eje)
        setSplashDone(true)
    }

    const handleExit = () => {
        setExiting(true)
        setTimeout(() => router.push(homeHref), 400)
    }

    const cicloInfo = CICLOS.find((c) => c.id === cicloSeleccionado)!
    const actividades = ACTIVIDADES_POR_CICLO[cicloSeleccionado]

    const mesesDisponibles = useMemo(() => {
        const set = new Set<string>()
        for (const a of actividades) { if (a.mes) set.add(a.mes) }
        return Array.from(set)
    }, [actividades])

    const actividadesFiltradas = useMemo(() => {
        return actividades.filter((a) => {
            if (ejeSeleccionado !== "todos" && a.ejeCasel !== ejeSeleccionado) return false
            if (mesSeleccionado !== "todos" && a.mes !== mesSeleccionado) return false
            if (tipoSeleccionado !== "todos" && a.tipo !== tipoSeleccionado) return false
            return true
        })
    }, [actividades, ejeSeleccionado, mesSeleccionado, tipoSeleccionado])

    const hayFiltros = ejeSeleccionado !== "todos" || mesSeleccionado !== "todos" || tipoSeleccionado !== "todos"

    const limpiarFiltros = () => {
        setEjeSeleccionado("todos")
        setMesSeleccionado("todos")
        setTipoSeleccionado("todos")
    }

    const proximamente = actividades.length === 0

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
                .sel-font { font-family: 'Nunito', sans-serif !important; }

                @keyframes bgFloat {
                    0%,100% { transform: translateY(0) scale(1); }
                    50%     { transform: translateY(-20px) scale(1.04); }
                }
                .bg-bubble {
                    animation: bgFloat var(--dur,9s) ease-in-out var(--delay,0s) infinite;
                }
                @keyframes navSlideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
                .nav-enter { animation: navSlideDown 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }

                @keyframes contentFadeUp {
                    from { transform: translateY(16px); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
                .content-enter { animation: contentFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both; }

                .card-hover {
                    transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.25s ease;
                }
                .card-hover:hover {
                    transform: translateY(-4px) scale(1.012);
                }
            `}</style>

            {!splashDone && <SELSplashScreen onEnter={handleSplashEnter} />}

            <div
                className={cn(
                    "fixed inset-0 z-40 overflow-hidden transition-opacity duration-400",
                    splashDone ? "opacity-100" : "opacity-0 pointer-events-none",
                    exiting && "opacity-0"
                )}
                style={{ background: "linear-gradient(135deg,#eef2ff 0%,#fdf4ff 45%,#fff8ed 100%)" }}
            >
                {/* Burbujas flotantes de fondo */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {BG_SHAPES.map((s, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full opacity-50 bg-bubble"
                            style={{
                                width: s.size, height: s.size,
                                top: s.top, left: s.left,
                                backgroundColor: s.color,
                                ["--dur" as string]: s.dur,
                                ["--delay" as string]: s.delay,
                            }}
                        />
                    ))}
                </div>

                {/* ── Navbar ── */}
                <div className={cn(
                    "relative z-10 flex items-center justify-between px-6 py-3.5",
                    "bg-white/70 backdrop-blur-lg border-b-2 border-white",
                    splashDone && "nav-enter",
                )}
                    style={{ boxShadow: "0 4px 24px rgba(99,102,241,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}
                >
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200">
                            <span className="text-lg">🧠</span>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="sel-font text-base font-black text-slate-800">Nitiv</span>
                                <span className="sel-font text-base font-black text-indigo-500">Juegos SEL</span>
                            </div>
                            <p className="sel-font text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                Modo de juego ✨
                            </p>
                        </div>
                    </div>

                    {/* Ciclos */}
                    <div className="hidden sm:flex items-center gap-2">
                        {CICLOS.map((ciclo) => {
                            const isActive = cicloSeleccionado === ciclo.id
                            return (
                                <button
                                    key={ciclo.id}
                                    onClick={() => { setCicloSeleccionado(ciclo.id); limpiarFiltros() }}
                                    className={cn(
                                        "sel-font rounded-xl px-3.5 py-2 text-xs font-black transition-all duration-200",
                                        isActive
                                            ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200 scale-105"
                                            : "bg-white/80 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105"
                                    )}
                                >
                                    {ciclo.label}
                                    <span className={cn("block text-[9px] font-bold leading-none mt-0.5 opacity-70")}>
                                        {ciclo.cursos}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Salir */}
                    <button
                        onClick={handleExit}
                        className={cn(
                            "sel-font flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black",
                            "bg-white text-slate-500 border-2 border-slate-200",
                            "hover:bg-red-50 hover:text-red-500 hover:border-red-300",
                            "transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                        )}
                        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Salir del modo de juego
                    </button>
                </div>

                {/* ── Contenido ── */}
                <div className="relative z-10 h-[calc(100vh-65px)] overflow-y-auto">
                    <div className={cn("mx-auto max-w-5xl px-6 py-6 space-y-5", splashDone && "content-enter")}>

                        {/* Enfoque del ciclo */}
                        {cicloInfo && (
                            <div className="rounded-3xl bg-white/70 backdrop-blur-sm border-2 border-white px-5 py-3.5"
                                style={{ boxShadow: "0 4px 20px rgba(99,102,241,0.08)" }}>
                                <p className="sel-font text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                    🎯 Enfoque · {cicloInfo.label} · {cicloInfo.cursos}
                                </p>
                                <p className="sel-font text-sm text-slate-600 leading-relaxed font-semibold">
                                    {cicloInfo.enfoque}
                                </p>
                            </div>
                        )}

                        {/* ── Filtros ── */}
                        {!proximamente && (
                            <div className="rounded-3xl bg-white/60 backdrop-blur-sm border-2 border-white px-5 py-4"
                                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                                <p className="sel-font text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    🔍 Filtrar actividades
                                </p>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                                        <label className="sel-font text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Eje CASEL
                                        </label>
                                        <Select
                                            value={ejeSeleccionado}
                                            onValueChange={(v) => setEjeSeleccionado(v as EjeCasel | "todos")}
                                        >
                                            <SelectTrigger className="sel-font bg-white border-2 border-slate-200 h-9 rounded-xl font-bold text-xs">
                                                <SelectValue placeholder="Todos los ejes" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todos">Todos los ejes</SelectItem>
                                                {EJES_CASEL.map((eje) => {
                                                    const c = COLORES_CASEL[eje]
                                                    return (
                                                        <SelectItem key={eje} value={eje}>
                                                            <span className="flex items-center gap-2">
                                                                <span className={cn("h-2 w-2 rounded-full shrink-0", c.dot)} />
                                                                {eje}
                                                            </span>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col gap-1.5 min-w-[150px]">
                                        <label className="sel-font text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Mes
                                        </label>
                                        <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                                            <SelectTrigger className="sel-font bg-white border-2 border-slate-200 h-9 rounded-xl font-bold text-xs">
                                                <SelectValue placeholder="Todos los meses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todos">Todos los meses</SelectItem>
                                                {mesesDisponibles.map((mes) => (
                                                    <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col gap-1.5 min-w-[150px]">
                                        <label className="sel-font text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Tipo
                                        </label>
                                        <Select
                                            value={tipoSeleccionado}
                                            onValueChange={(v) => setTipoSeleccionado(v as TipoActividad | "todos")}
                                        >
                                            <SelectTrigger className="sel-font bg-white border-2 border-slate-200 h-9 rounded-xl font-bold text-xs">
                                                <SelectValue placeholder="Todos los tipos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todos">Todos los tipos</SelectItem>
                                                {TIPOS.map((tipo) => {
                                                    const c = COLORES_TIPO[tipo]
                                                    return (
                                                        <SelectItem key={tipo} value={tipo}>
                                                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", c.bg, c.text)}>
                                                                {tipo}
                                                            </span>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {hayFiltros && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={limpiarFiltros}
                                            className="sel-font h-9 text-xs font-black text-slate-400 gap-1.5 self-end hover:text-red-500 rounded-xl"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Limpiar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Conteo */}
                        {!proximamente && (
                            <p className="sel-font text-xs text-slate-400 font-bold px-1">
                                <span className="text-slate-700 font-black text-sm">{actividadesFiltradas.length}</span>{" "}
                                {actividadesFiltradas.length === 1 ? "actividad" : "actividades"}
                                {hayFiltros && " con los filtros aplicados"}
                            </p>
                        )}

                        {/* Grid */}
                        {proximamente ? (
                            <div className="rounded-3xl border-2 border-dashed border-indigo-200 bg-white/50 px-8 py-20 text-center">
                                <BookOpen className="mx-auto h-10 w-10 text-indigo-300 mb-3" />
                                <p className="sel-font text-slate-500 font-black text-lg">¡Próximamente! 🚀</p>
                                <p className="sel-font text-slate-400 text-sm mt-1 font-semibold">
                                    Las actividades para {cicloInfo?.cursos} estarán disponibles muy pronto.
                                </p>
                            </div>
                        ) : actividadesFiltradas.length === 0 ? (
                            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 px-8 py-16 text-center">
                                <p className="sel-font text-slate-400 text-sm font-bold">
                                    No hay actividades para los filtros seleccionados.
                                </p>
                                <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="sel-font mt-3 text-xs text-indigo-500 font-black rounded-xl">
                                    Limpiar filtros
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-10">
                                {actividadesFiltradas.map((actividad, i) => (
                                    <div key={actividad.id} className="card-hover">
                                        <ActividadCard actividad={actividad} index={i} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
