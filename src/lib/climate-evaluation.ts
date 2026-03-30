/**
 * Clima de aula — modelo por metáforas climáticas (GACC / práctica docente).
 * `energy_level` en `teacher_logs` almacena la clave del clima (nuevo modelo)
 * o el modelo histórico (explosiva, inquieta, regulada, apática).
 */

export const CLASSROOM_CLIMATES = [
    "tormenta",
    "nublado",
    "parcial",
    "soleado",
    "extraordinario",
    "no_aplica",
] as const

export type ClassroomClimate = (typeof CLASSROOM_CLIMATES)[number]

/** Etiquetas opcionales al caracterizar el clima (máx. 2 en UI). */
export const CLIMATE_CHARACTERIZATION_TAGS = [
    "Conflicto entre pares",
    "Desconexión general",
    "Alta energía positiva",
    "Estudiante aislado",
    "Baja participación",
    "Tensión no resuelta",
    "Desregulación emocional",
    "Cohesión grupal notable",
] as const

const LEGACY_ENERGY = ["explosiva", "inquieta", "regulada", "apatica"] as const

/** Orden para gráficos: de más adversa a más favorable; modelo anterior al final. */
export const CLIMATE_STATS_ORDER = [
    ...CLASSROOM_CLIMATES,
    ...LEGACY_ENERGY,
] as const

export type ClimateStatsKey = (typeof CLIMATE_STATS_ORDER)[number]

const SCORE: Record<string, number | null> = {
    tormenta: 1,
    nublado: 2,
    parcial: 3,
    soleado: 4,
    extraordinario: 5,
    no_aplica: null,
    explosiva: 1,
    apatica: 2,
    inquieta: 3,
    regulada: 4,
}

export const CLIMATE_META: Record<
    ClassroomClimate,
    { label: string; desc: string; emoji: string; color: string }
> = {
    tormenta: {
        label: "Tormenta",
        desc: "Tensión, conflicto o desconexión evidente",
        emoji: "⛈️",
        color: "#ef4444", // Rojo
    },
    nublado: {
        label: "Nublado",
        desc: "Clima irregular, momentos difíciles",
        emoji: "☁️",
        color: "#64748b", // Gris oscuro
    },
    parcial: {
        label: "Parcial",
        desc: "Más bien bien, con algo de fricción",
        emoji: "🌤️",
        color: "#eab308", // Amarillo
    },
    soleado: {
        label: "Soleado",
        desc: "Buen clima, participación y respeto",
        emoji: "☀️",
        color: "#f97316", // Naranjo
    },
    extraordinario: {
        label: "Extraordinario",
        desc: "Clima excepcional, mejor que lo habitual",
        emoji: "✨",
        color: "#10b981", // Verde
    },
    no_aplica: {
        label: "No aplica",
        desc: "Clase atípica, sin referencia válida",
        emoji: "⬜",
        color: "#d6d3d1", // Gris/blanco más oscuro (stone-300)
    },
}

const LEGACY_META: Record<string, { label: string; desc: string; emoji: string; color: string }> = {
    explosiva: { label: "Explosiva", desc: "Modelo anterior", emoji: "💥", color: "#ef4444" },
    inquieta: { label: "Inquieta", desc: "Modelo anterior", emoji: "😯", color: "#f59e0b" },
    regulada: { label: "Regulada", desc: "Modelo anterior", emoji: "😊", color: "#10b981" },
    apatica: { label: "Apática", desc: "Modelo anterior", emoji: "😐", color: "#6366f1" },
}

export function climateColor(energyLevel: string | null | undefined): string {
    if (!energyLevel) return "#94a3b8"
    return CLIMATE_META[energyLevel as ClassroomClimate]?.color ?? LEGACY_META[energyLevel]?.color ?? "#94a3b8"
}

export function climateLabel(energyLevel: string | null | undefined): string {
    if (!energyLevel) return "—"
    return (
        CLIMATE_META[energyLevel as ClassroomClimate]?.label ??
        LEGACY_META[energyLevel]?.label ??
        energyLevel
    )
}

export function climateDefinition(energyLevel: string | null | undefined): {
    label: string
    desc: string
    emoji: string
} | null {
    if (!energyLevel) return null
    const m =
        CLIMATE_META[energyLevel as ClassroomClimate] ?? LEGACY_META[energyLevel]
    if (!m) return { label: energyLevel, desc: "", emoji: "📌" }
    return { label: m.label, desc: m.desc, emoji: m.emoji }
}

/** Puntuación numérica 1–5 para tendencias; null excluye del promedio (p. ej. no_aplica). */
export function climateNumericScore(energyLevel: string | null | undefined): number | null {
    if (!energyLevel) return null
    const s = SCORE[energyLevel]
    if (s === undefined) return 3
    return s
}

/**
 * Puntuación para promedios y tendencias (1–5). `no_aplica` y valores nulos usan 3 (neutro), igual que el modelo anterior con ?? 3.
 */
export function climateScoreForAggregation(energyLevel: string | null | undefined): number {
    return climateNumericScore(energyLevel) ?? 3
}

export function averageClimateScore(
    logs: Array<{ energy_level?: string | null }>
): number | null {
    if (logs.length === 0) return null
    const sum = logs.reduce((a, l) => a + climateScoreForAggregation(l.energy_level), 0)
    return sum / logs.length
}

export function initClimateCountMap(): Record<string, number> {
    const m: Record<string, number> = {}
    for (const k of CLIMATE_STATS_ORDER) m[k] = 0
    return m
}
