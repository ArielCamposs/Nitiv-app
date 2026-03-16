"use client"

const AXES = {
    ac: { label: "Autoconciencia",     emoji: "🧠", color: "#db2777" },
    ag: { label: "Autogestión",        emoji: "🎯", color: "#7c3aed" },
    cs: { label: "Conciencia Social",  emoji: "🤝", color: "#d97706" },
    hr: { label: "Hab. Relacionales",  emoji: "💬", color: "#4f46e5" },
    td: { label: "Toma de Decisiones", emoji: "⚖️", color: "#b45309" },
} as const
type AxisKey = keyof typeof AXES
const AXIS_ORDER: AxisKey[] = ["ac", "ag", "cs", "hr", "td"]

const CX = 150, CY = 155, MAX_R = 95, N = 5

function rad(idx: number) {
    return (Math.PI * 2 * idx / N) - Math.PI / 2
}

function pt(score: number, idx: number) {
    const r = (score / 5) * MAX_R
    return { x: CX + r * Math.cos(rad(idx)), y: CY + r * Math.sin(rad(idx)) }
}

function ptStr(score: number, idx: number) {
    const p = pt(score, idx)
    return `${p.x},${p.y}`
}

function gridPentagon(level: number) {
    return AXIS_ORDER.map((_, i) => ptStr(level, i)).join(" ")
}

interface Props {
    scores: Partial<Record<AxisKey, number>>
    size?: number
}

export function RadarChart({ scores, size = 320 }: Props) {
    const dataPolygon = AXIS_ORDER.map((ax, i) => ptStr(scores[ax] ?? 0, i)).join(" ")

    return (
        <svg
            viewBox="0 0 300 310"
            width={size}
            height={size}
            className="mx-auto overflow-visible"
        >
            <defs>
                <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#db2777" stopOpacity="0.35" />
                </linearGradient>
            </defs>

            {/* Grid pentagons */}
            {[1, 2, 3, 4, 5].map(lvl => (
                <polygon
                    key={lvl}
                    points={gridPentagon(lvl)}
                    fill="none"
                    stroke={lvl === 5 ? "#cbd5e1" : "#e2e8f0"}
                    strokeWidth={lvl === 5 ? 1.5 : 1}
                />
            ))}

            {/* Axis lines from center */}
            {AXIS_ORDER.map((_, i) => {
                const end = pt(5, i)
                return (
                    <line
                        key={i}
                        x1={CX} y1={CY}
                        x2={end.x} y2={end.y}
                        stroke="#e2e8f0"
                        strokeWidth={1}
                    />
                )
            })}

            {/* Data polygon */}
            <polygon
                points={dataPolygon}
                fill="url(#radarFill)"
                stroke="#6366f1"
                strokeWidth={2}
                strokeLinejoin="round"
            />

            {/* Dots at each axis value */}
            {AXIS_ORDER.map((ax, i) => {
                const score = scores[ax] ?? 0
                const p = pt(score, i)
                return (
                    <circle
                        key={ax}
                        cx={p.x}
                        cy={p.y}
                        r={4}
                        fill={AXES[ax].color}
                        stroke="white"
                        strokeWidth={2}
                    />
                )
            })}

            {/* Score labels at each dot */}
            {AXIS_ORDER.map((ax, i) => {
                const score = scores[ax]
                if (!score) return null
                const p = pt(score, i)
                // Nudge label away from dot
                const angle = rad(i)
                const nx = p.x + Math.cos(angle) * 13
                const ny = p.y + Math.sin(angle) * 13
                return (
                    <text key={ax} x={nx} y={ny} textAnchor="middle" dominantBaseline="middle"
                        fontSize="9" fontWeight="700" fill={AXES[ax].color}>
                        {score.toFixed(1)}
                    </text>
                )
            })}

            {/* Axis labels (emoji + abbr) outside pentagon */}
            {AXIS_ORDER.map((ax, i) => {
                const LABEL_R = MAX_R + 28
                const angle = rad(i)
                const lx = CX + LABEL_R * Math.cos(angle)
                const ly = CY + LABEL_R * Math.sin(angle)
                const a = AXES[ax]
                return (
                    <g key={ax}>
                        <text x={lx} y={ly - 7} textAnchor="middle" fontSize="16">{a.emoji}</text>
                        <title>{a.label}</title>
                        <text
                            x={lx}
                            y={ly + 10}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="700"
                            fill={a.color}
                            letterSpacing="0.5"
                        >
                            {ax.toUpperCase()}
                        </text>
                    </g>
                )
            })}

            {/* Level labels on right axis */}
            {[1, 2, 3, 4, 5].map(lvl => {
                const p = pt(lvl, 1) // use axis 1 (ag) as reference
                return (
                    <text key={lvl} x={p.x + 5} y={p.y} fontSize="7.5"
                        fill="#94a3b8" fontWeight="600" dominantBaseline="middle">
                        {lvl}
                    </text>
                )
            })}
        </svg>
    )
}
