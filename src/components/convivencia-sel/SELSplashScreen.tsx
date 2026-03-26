"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { EjeCasel } from "@/lib/data/convivencia-sel"

const TITLE_LETTERS = [
    { char: "N", color: "#6366f1" },
    { char: "i", color: "#ec4899" },
    { char: "t", color: "#f59e0b" },
    { char: "i", color: "#10b981" },
    { char: "v", color: "#3b82f6" },
]

const SEL_LETTERS = [
    { char: "S", color: "#8b5cf6" },
    { char: "E", color: "#f43f5e" },
    { char: "L", color: "#f59e0b" },
]

type EjeInfo = {
    eje: EjeCasel
    emoji: string
    bg: string
    text: string
    border: string
    shadow: string
    floatX: string
    floatY: string
}

const EJES_INFO: EjeInfo[] = [
    {
        eje: "Autoconciencia",
        emoji: "🪞",
        bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300",
        shadow: "rgba(139,92,246,0.30)",
        floatX: "5px", floatY: "-10px",
    },
    {
        eje: "Autoregulación",
        emoji: "🌬️",
        bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300",
        shadow: "rgba(59,130,246,0.30)",
        floatX: "-7px", floatY: "8px",
    },
    {
        eje: "Habilidades Relacionales",
        emoji: "🤝",
        bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300",
        shadow: "rgba(236,72,153,0.30)",
        floatX: "8px", floatY: "-7px",
    },
    {
        eje: "Conciencia Social",
        emoji: "🌍",
        bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300",
        shadow: "rgba(20,184,166,0.30)",
        floatX: "-6px", floatY: "10px",
    },
    {
        eje: "Toma de decisiones" as EjeCasel,
        emoji: "⚡",
        bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300",
        shadow: "rgba(245,158,11,0.30)",
        floatX: "-8px", floatY: "-8px",
    },
]

// 15 patrones con posiciones realmente distintas.
// Formato: [top, left, rotate] para cada uno de los 5 ejes.
// Zona segura: top 10–78%, left 8–70% (evita el centro y los bordes extremos).
const PATTERNS: Array<[string, string, string][]> = [
    // 0 — Cruz: arriba-centro, medio-lados, abajo-centro
    [["11%","38%","-5deg"],["42%","8%","7deg"],["42%","62%","-6deg"],["76%","28%","5deg"],["76%","55%","-7deg"]],
    // 1 — Diagonal de arriba-izq a abajo-der
    [["10%","8%","6deg"],["22%","28%","-5deg"],["42%","44%","8deg"],["62%","56%","-6deg"],["75%","62%","5deg"]],
    // 2 — Diagonal inversa abajo-izq a arriba-der
    [["75%","8%","-7deg"],["60%","24%","5deg"],["42%","38%","-5deg"],["24%","52%","7deg"],["10%","64%","-6deg"]],
    // 3 — W: 3 arriba, 2 abajo
    [["10%","8%","5deg"],["10%","38%","-6deg"],["10%","62%","7deg"],["72%","20%","-5deg"],["72%","52%","6deg"]],
    // 4 — M: 2 arriba, 1 medio, 2 abajo
    [["10%","10%","-7deg"],["10%","58%","5deg"],["40%","32%","8deg"],["74%","8%","-5deg"],["74%","60%","6deg"]],
    // 5 — Círculo aproximado
    [["10%","38%","6deg"],["40%","66%","-7deg"],["72%","52%","5deg"],["72%","18%","-6deg"],["40%","8%","7deg"]],
    // 6 — Dos filas: 2 arriba, 3 abajo
    [["12%","14%","-5deg"],["12%","56%","7deg"],["74%","8%","5deg"],["74%","38%","-6deg"],["74%","62%","6deg"]],
    // 7 — Dos filas: 3 arriba, 2 abajo
    [["10%","8%","7deg"],["10%","36%","-5deg"],["10%","62%","6deg"],["74%","22%","-7deg"],["74%","56%","5deg"]],
    // 8 — Zigzag vertical
    [["10%","8%","-6deg"],["28%","56%","7deg"],["46%","10%","5deg"],["64%","60%","-5deg"],["78%","28%","6deg"]],
    // 9 — Zigzag invertido
    [["10%","60%","5deg"],["28%","12%","-7deg"],["46%","58%","6deg"],["64%","10%","-5deg"],["78%","54%","7deg"]],
    // 10 — Aspa (X)
    [["12%","10%","6deg"],["12%","60%","-7deg"],["42%","36%","5deg"],["74%","10%","-5deg"],["74%","60%","7deg"]],
    // 11 — Columna izquierda + derecha disperso
    [["14%","8%","-6deg"],["34%","8%","7deg"],["58%","8%","5deg"],["20%","60%","-5deg"],["68%","56%","6deg"]],
    // 12 — Fila superior + triangulo abajo
    [["10%","18%","5deg"],["10%","52%","-6deg"],["60%","8%","7deg"],["60%","38%","-5deg"],["60%","64%","6deg"]],
    // 13 — Disperso libre A
    [["14%","52%","-8deg"],["38%","8%","6deg"],["20%","10%","5deg"],["70%","42%","-6deg"],["54%","62%","7deg"]],
    // 14 — Disperso libre B
    [["10%","22%","7deg"],["28%","62%","-5deg"],["54%","10%","6deg"],["72%","60%","-7deg"],["40%","38%","5deg"]],
]

const SHAPES = [
    { size: 80,  top: "6%",  left: "32%", color: "#fde68a", delay: "0s",   dur: "6s"   },
    { size: 55,  top: "16%", left: "76%", color: "#bfdbfe", delay: "1s",   dur: "5s"   },
    { size: 100, top: "76%", left: "24%", color: "#ddd6fe", delay: "0.5s", dur: "7s"   },
    { size: 65,  top: "80%", left: "68%", color: "#fbcfe8", delay: "2s",   dur: "5.5s" },
    { size: 40,  top: "46%", left: "84%", color: "#a7f3d0", delay: "1.5s", dur: "6.5s" },
    { size: 70,  top: "52%", left: "10%", color: "#fed7aa", delay: "0.8s", dur: "5.8s" },
    { size: 38,  top: "32%", left: "46%", color: "#fecaca", delay: "2.5s", dur: "4.5s" },
]

interface Props {
    onEnter: (eje: EjeCasel | "todos") => void
}

export function SELSplashScreen({ onEnter }: Props) {
    const [mounted, setMounted]                 = useState(false)
    const [pattern, setPattern]                 = useState<[string, string, string][]>(PATTERNS[0])
    const [visibleLetters, setVisibleLetters]   = useState<number[]>([])
    const [selVisible, setSelVisible]           = useState(false)
    const [subtitleVisible, setSubtitleVisible] = useState(false)
    const [visibleEjes, setVisibleEjes]         = useState<number[]>([])
    const [hintVisible, setHintVisible]         = useState(false)
    const [hoveredEje, setHoveredEje]           = useState<number | null>(null)
    const [exiting, setExiting]                 = useState(false)

    useEffect(() => {
        // Todo lo aleatorio y las animaciones arrancan aquí, solo en cliente
        setMounted(true)
        setPattern(PATTERNS[Math.floor(Math.random() * PATTERNS.length)])

        TITLE_LETTERS.forEach((_, i) => {
            setTimeout(() => setVisibleLetters((p) => [...p, i]), 200 + i * 130)
        })
        const base = 200 + TITLE_LETTERS.length * 130
        setTimeout(() => setSelVisible(true),      base + 150)
        setTimeout(() => setSubtitleVisible(true), base + 500)
        EJES_INFO.forEach((_, i) => {
            setTimeout(() => setVisibleEjes((p) => [...p, i]), base + 880 + i * 180)
        })
        setTimeout(() => setHintVisible(true), base + 880 + EJES_INFO.length * 180 + 150)
    }, [])

    const handleSelectEje = (eje: EjeCasel | "todos") => {
        setExiting(true)
        setTimeout(() => onEnter(eje), 480)
    }

    return (
        <>
            <style>{`
                @keyframes floatDrift {
                    0%   { transform: translate(0,0) rotate(0deg); }
                    33%  { transform: translate(var(--fx),var(--fy)) rotate(2deg); }
                    66%  { transform: translate(calc(var(--fx)*-0.6),calc(var(--fy)*0.7)) rotate(-1.5deg); }
                    100% { transform: translate(0,0) rotate(0deg); }
                }
                @keyframes shapeFloat {
                    0%,100% { transform: translateY(0) scale(1); }
                    50%     { transform: translateY(-18px) scale(1.03); }
                }
                @keyframes dropBounce {
                    0%   { transform: translateY(-80px) scaleY(0.8); opacity:0; }
                    60%  { transform: translateY(10px) scaleY(1.1); opacity:1; }
                    80%  { transform: translateY(-5px) scaleY(0.97); }
                    100% { transform: translateY(0) scaleY(1); opacity:1; }
                }
                @keyframes popIn {
                    0%   { transform: scale(0) rotate(-10deg); opacity:0; }
                    70%  { transform: scale(1.15) rotate(3deg); opacity:1; }
                    100% { transform: scale(1) rotate(0deg); opacity:1; }
                }
                @keyframes slideUp {
                    0%   { transform: translateY(18px); opacity:0; }
                    100% { transform: translateY(0); opacity:1; }
                }
                @keyframes ejeEntrance {
                    0%   { transform: scale(0.5) rotate(-8deg); opacity:0; }
                    65%  { transform: scale(1.08) rotate(2deg); opacity:1; }
                    100% { transform: scale(1) rotate(var(--rot)); opacity:1; }
                }
                .letter-drop  { animation: dropBounce 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
                .sel-pop      { animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
                .slide-up     { animation: slideUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
                .shape-float  { animation: shapeFloat var(--dur,6s) ease-in-out var(--delay,0s) infinite; }
                .eje-entering { animation: ejeEntrance 0.55s cubic-bezier(0.34,1.4,0.64,1) forwards; }
                .eje-floating {
                    animation: floatDrift var(--fdur,7s) ease-in-out var(--fdelay,0s) infinite;
                }
            `}</style>

            <div
                className={cn(
                    "fixed inset-0 z-50 overflow-hidden transition-all duration-500",
                    exiting ? "opacity-0 scale-110" : "opacity-100 scale-100"
                )}
                style={{ background: "linear-gradient(135deg,#f0f4ff 0%,#fdf2ff 45%,#fff7ed 100%)" }}
            >
                {/* Burbujas de fondo */}
                <div className="pointer-events-none absolute inset-0">
                    {SHAPES.map((s, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full opacity-50 shape-float"
                            style={{
                                width: s.size, height: s.size,
                                top: s.top, left: s.left,
                                backgroundColor: s.color,
                                ["--delay" as string]: s.delay,
                                ["--dur" as string]: s.dur,
                            }}
                        />
                    ))}
                </div>

                {/* Ejes — solo se renderizan en cliente para evitar mismatch de hidratación */}
                {mounted && EJES_INFO.map((e, i) => {
                    const [top, left, rotate] = pattern[i]
                    const visible = visibleEjes.includes(i)
                    const isHovered = hoveredEje === i

                    return (
                        <button
                            key={e.eje}
                            onClick={() => handleSelectEje(e.eje)}
                            onMouseEnter={() => setHoveredEje(i)}
                            onMouseLeave={() => setHoveredEje(null)}
                            className={cn(
                                "absolute inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5",
                                "text-sm font-black cursor-pointer select-none",
                                e.bg, e.text, e.border,
                                !visible && "opacity-0 pointer-events-none",
                                visible && !isHovered && "eje-floating",
                                visible && isHovered && "eje-floating",
                            )}
                            style={{
                                top, left,
                                rotate: isHovered ? "0deg" : rotate,
                                boxShadow: isHovered
                                    ? `0 10px 28px ${e.shadow}`
                                    : `0 3px 12px ${e.shadow}`,
                                transform: visible ? undefined : "scale(0.5)",
                                zIndex: isHovered ? 20 : 10,
                                transition: "rotate 0.2s ease, box-shadow 0.2s ease, scale 0.2s ease",
                                ["--fx" as string]: e.floatX,
                                ["--fy" as string]: e.floatY,
                                ["--rot" as string]: rotate,
                                ["--fdur" as string]: `${6.5 + i * 0.6}s`,
                                ["--fdelay" as string]: `${i * 0.5}s`,
                            }}
                        >
                            <span className={cn(
                                "text-lg transition-transform duration-200",
                                isHovered && "scale-125"
                            )}>
                                {e.emoji}
                            </span>
                            <span>{e.eje}</span>
                            <span className={cn(
                                "text-xs opacity-0 -ml-1 transition-all duration-200",
                                isHovered && "opacity-60 ml-0"
                            )}>→</span>
                        </button>
                    )
                })}

                {/* Centro: título + subtítulo + hint */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                    {/* Título */}
                    <div className="flex items-end gap-1">
                        {TITLE_LETTERS.map((l, i) => (
                            <span
                                key={i}
                                className={cn(
                                    "text-6xl font-black leading-none select-none opacity-0",
                                    visibleLetters.includes(i) && "letter-drop"
                                )}
                                style={{
                                    color: l.color,
                                    textShadow: `0 4px 14px ${l.color}55`,
                                    display: "inline-block",
                                }}
                            >
                                {l.char}
                            </span>
                        ))}
                        <span className={cn(
                            "mx-2 text-4xl font-black text-slate-300 leading-none select-none opacity-0 self-center",
                            selVisible && "sel-pop"
                        )}>·</span>
                        {SEL_LETTERS.map((l, i) => (
                            <span
                                key={i}
                                className={cn(
                                    "text-6xl font-black leading-none select-none opacity-0",
                                    selVisible && "sel-pop"
                                )}
                                style={{
                                    color: l.color,
                                    textShadow: `0 4px 14px ${l.color}55`,
                                    animationDelay: selVisible ? `${i * 0.08}s` : "0s",
                                    display: "inline-block",
                                }}
                            >
                                {l.char}
                            </span>
                        ))}
                    </div>

                    {/* Subtítulo */}
                    <p className={cn(
                        "text-sm font-semibold tracking-widest uppercase text-slate-400 opacity-0",
                        subtitleVisible && "slide-up"
                    )}>
                        Juegos SEL · Habilidades Socioemocionales
                    </p>

                    {/* Hint */}
                    <p className={cn(
                        "text-xs font-medium text-slate-400 opacity-0 mt-1",
                        hintVisible && "slide-up"
                    )}>
                        Elige un eje para comenzar ✨
                    </p>
                </div>
            </div>
        </>
    )
}
