"use client"

import { useState, useMemo } from "react"
import { ClimateHistoryChart } from "@/components/teacher/climate-history-chart"
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    BarChart,
    Bar,
    CartesianGrid,
} from "recharts"
import {
    BarChart3,
    Calendar,
    Layers,
    TrendingUp,
    Users,
    Sparkles,
    ThermometerSun,
} from "lucide-react"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

const ENERGY_LABEL: Record<string, { label: string; color: string }> = {
    explosiva: { label: "Explosiva", color: "text-red-600" },
    apatica: { label: "Apática", color: "text-blue-500" },
    inquieta: { label: "Inquieta", color: "text-yellow-600" },
    regulada: { label: "Regulada", color: "text-green-600" },
}

const ENERGY_ORDER = ["regulada", "inquieta", "apatica", "explosiva"] as const
const ENERGY_CHART_COLORS = ["#10b981", "#f59e0b", "#6366f1", "#ef4444"] // emerald, amber, indigo, red

type CourseItem = { course_id: string; courses: { name: string } }

interface Props {
    courses: CourseItem[]
    historyLogs: any[]
    teachers?: { id: string; name: string; last_name?: string }[]
}

function getWeekKey(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00")
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d)
    mon.setDate(diff)
    return mon.toISOString().slice(0, 10)
}

type RecommendationPriority = "critical" | "warning" | "attention" | "ok" | "good" | "low_data"

function getCourseRecommendation(
    avg: number | null,
    dominant: string | null,
    count: number
): { title: string; summary: string; actions: string[]; priority: RecommendationPriority } {
    if (count < 3) {
        return {
            priority: "low_data",
            title: "Pocos registros",
            summary: "Aún no hay suficientes datos para un diagnóstico confiable. Se recomienda aumentar la frecuencia de registro del clima en este curso.",
            actions: [
                "Registrar clima al menos 2–3 veces por semana",
                "Involucrar a más docentes del curso en el registro",
            ],
        }
    }

    const score = avg ?? 0

    if (score < 1.5) {
        return {
            priority: "critical",
            title: "Clima muy bajo — intervención prioritaria",
            summary: "El promedio de clima es muy bajo. Se sugiere intervención inmediata y coordinación con convivencia y/o dupla.",
            actions: [
                "Coordinar con convivencia y dupla para plan de contención",
                "Revisar dinámicas de aula y posibles conflictos no resueltos",
                "Mediación y espacios de calma; comunicación con apoderados si aplica",
            ],
        }
    }

    if (dominant === "explosiva") {
        return {
            priority: "critical",
            title: "Clima explosivo detectado",
            summary: "Predomina un clima de descontrol o conflictos visibles. Priorizar contención y resolución de conflictos.",
            actions: [
                "Aplicar mediación y técnicas de contención emocional",
                "Establecer pausas y rutinas claras antes de retomar la clase",
                "Derivar a convivencia/dupla si hay situaciones recurrentes",
            ],
        }
    }

    if (score < 2) {
        return {
            priority: "warning",
            title: "Clima bajo — requiere atención",
            summary: "El curso presenta clima bajo de forma consistente. Conviene revisar dinámicas y reforzar el vínculo con el curso.",
            actions: [
                "Implementar actividades de regulación al inicio o después de recreos",
                "Revisar nivel de exigencia y carga; ofrecer más momentos de logro",
                "Reforzar vínculo docente–curso con instancias breves de diálogo",
            ],
        }
    }

    if (dominant === "apatica") {
        return {
            priority: "attention",
            title: "Clima apático — baja participación",
            summary: "El curso muestra desmotivación o poca participación. Conviene reactivar con actividades que involucren a todos.",
            actions: [
                "Incluir actividades que reactiven (colaborativas, lúdicas o con movimiento)",
                "Revisar si la demanda es muy alta o monótona; variar formatos",
                "Dar espacio a la voz de los estudiantes en decisiones de clase",
            ],
        }
    }

    if (dominant === "inquieta") {
        return {
            priority: "attention",
            title: "Clima inquieto — ruido o dispersión",
            summary: "Hay un nivel de ruido o dispersión alto. Las pausas y el ritmo claro suelen ayudar.",
            actions: [
                "Incorporar pausas activas o de respiración entre bloques",
                "Ajustar el ritmo: secuencias más cortas y transiciones claras",
                "Reforzar rutinas de inicio y cierre de clase",
            ],
        }
    }

    if (dominant === "regulada" && score >= 3) {
        return {
            priority: "good",
            title: "Buen clima de aprendizaje",
            summary: "El curso mantiene un clima regulado. Conviene sostener las prácticas que lo favorecen.",
            actions: [
                "Mantener dinámicas actuales que favorecen el clima",
                "Documentar qué momentos o actividades funcionan mejor",
                "Compartir buenas prácticas con otros cursos si aplica",
            ],
        }
    }

    if (score >= 2.5) {
        return {
            priority: "ok",
            title: "Clima en rango medio",
            summary: "El clima está en un rango aceptable. Hay espacio para reforzar momentos más regulados.",
            actions: [
                "Identificar en qué momentos el clima mejora y repetir esas condiciones",
                "Fomentar más instancias de clima regulada con pequeñas rutinas",
            ],
        }
    }

    return {
        priority: "attention",
        title: "Oportunidad de mejora",
        summary: "El clima puede mejorar con acciones focalizadas según el tipo de situación más frecuente.",
        actions: [
            "Revisar si hay patrones (día, hora, tipo de actividad) con peor clima",
            "Probar pausas o cambios de ritmo en esos momentos",
        ],
    }
}

export function ClimateHeatmapTabs({ courses, historyLogs, teachers = [] }: Props) {
    const [tab, setTab] = useState<"calendario" | "estadisticas">("calendario")

    const stats = useMemo(() => {
        const total = historyLogs.length
        const byLevel: Record<string, number> = {}
        ENERGY_ORDER.forEach(k => { byLevel[k] = 0 })
        historyLogs.forEach((l: any) => {
            const k = l.energy_level || "regulada"
            if (k in byLevel) byLevel[k]++
        })
        const avgGlobal = total > 0
            ? historyLogs.reduce((a: number, l: any) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / total
            : null
        const dominant = total > 0
            ? (Object.entries(byLevel).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
            : null
        const pctRegulada = total > 0 ? Math.round(((byLevel.regulada ?? 0) / total) * 100) : 0

        const byCourse = courses.map((course) => {
            const id = course.course_id
            const logs = historyLogs.filter((l: any) => l.course_id === id)
            const n = logs.length
            const courseAvg = n > 0
                ? logs.reduce((a: number, l: any) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / n
                : null
            const courseDominant = n > 0
                ? (Object.entries(
                    logs.reduce((acc: Record<string, number>, l: any) => {
                        const k = l.energy_level || "regulada"
                        acc[k] = (acc[k] ?? 0) + 1
                        return acc
                    }, {})
                ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
                : null
            const recommendation = getCourseRecommendation(courseAvg, courseDominant, n)
            return {
                name: course.courses?.name ?? id,
                id,
                count: n,
                avg: courseAvg,
                dominant: courseDominant,
                recommendation,
            }
        }).filter(c => c.count > 0).sort((a, b) => {
            const order: Record<RecommendationPriority, number> = {
                critical: 0, warning: 1, attention: 2, ok: 3, good: 4, low_data: 5,
            }
            const pa = order[a.recommendation.priority]
            const pb = order[b.recommendation.priority]
            if (pa !== pb) return pa - pb
            return (a.avg ?? 4) - (b.avg ?? 4) // peor promedio primero
        })

        const weekMap: Record<string, { total: number; sum: number }> = {}
        const now = new Date()
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(now.getDate() - i * 7)
            const key = getWeekKey(d.toISOString().slice(0, 10))
            weekMap[key] = { total: 0, sum: 0 }
        }
        historyLogs.forEach((l: any) => {
            const key = getWeekKey(l.log_date)
            if (key in weekMap) {
                weekMap[key].total++
                weekMap[key].sum += ENERGY_SCORE[l.energy_level] ?? 3
            }
        })
        const weeklyTrend = Object.entries(weekMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([week, v]) => ({
                semana: new Date(week + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
                registros: v.total,
                promedio: v.total > 0 ? Number((v.sum / v.total).toFixed(2)) : 0,
            }))

        const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie"]
        const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        historyLogs.forEach((l: any) => {
            const d = new Date(l.log_date + "T12:00:00")
            const day = d.getDay()
            const key = day === 0 ? 5 : day
            if (key in byDay) byDay[key]++
        })
        const byDayOfWeek = [1, 2, 3, 4, 5].map((i) => ({
            dia: dayNames[i - 1],
            registros: byDay[i] ?? 0,
        }))

        const byTeacher: Record<string, number> = {}
        const teacherCourses: Record<string, Set<string>> = {}
        historyLogs.forEach((l: any) => {
            const id = l.teacher_id || "sin-asignar"
            byTeacher[id] = (byTeacher[id] ?? 0) + 1
            if (!teacherCourses[id]) teacherCourses[id] = new Set()
            if (l.course_id) teacherCourses[id].add(l.course_id)
        })
        const courseIdToName = Object.fromEntries(courses.map(c => [c.course_id, c.courses?.name ?? c.course_id]))
        const topTeachers = Object.entries(byTeacher)
            .map(([id, count]) => {
                const t = teachers.find(t => t.id === id)
                const displayName = t
                    ? [t.last_name, t.name].filter(Boolean).join(", ") || t.name || "Docente"
                    : "Docente"
                const courseNames = (teacherCourses[id] ? Array.from(teacherCourses[id]) : [])
                    .map(cid => courseIdToName[cid] ?? cid)
                    .sort()
                return {
                    name: displayName,
                    count,
                    courseNames,
                }
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)

        const pieData = ENERGY_ORDER.map((key, i) => ({
            name: ENERGY_LABEL[key]?.label ?? key,
            value: byLevel[key] ?? 0,
            color: ENERGY_CHART_COLORS[i],
        })).filter(d => d.value > 0)

        const barCourseData = byCourse.map(c => ({
            nombre: c.name.length > 12 ? c.name.slice(0, 11) + "…" : c.name,
            promedio: c.avg ?? 0,
            registros: c.count,
        }))

        return {
            totalRegistros: total,
            byLevel,
            avgGlobal,
            dominant,
            byCourse,
            pctRegulada,
            weeklyTrend,
            byDayOfWeek,
            topTeachers,
            pieData,
            barCourseData,
        }
    }, [historyLogs, courses, teachers])

    return (
        <div className="space-y-6">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { key: "calendario" as const, label: "Calendario" },
                    { key: "estadisticas" as const, label: "Estadísticas" },
                ].map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "calendario" && (
                <ClimateHistoryChart
                    courses={courses}
                    historyLogs={historyLogs}
                    showFilters={true}
                    teachers={teachers}
                />
            )}

            {tab === "estadisticas" && (
                <div className="space-y-8 pt-2">
                    <div className="flex items-center gap-2 text-slate-800 mb-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <h2 className="text-xl font-bold">Panorama del clima emocional</h2>
                    </div>

                    {/* Hero KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 text-white shadow-lg">
                            <Layers className="absolute right-3 top-3 w-8 h-8 opacity-20" />
                            <p className="text-indigo-100 text-xs font-semibold uppercase tracking-wider">Total registros</p>
                            <p className="text-3xl font-black tabular-nums mt-1">{stats.totalRegistros}</p>
                            <p className="text-indigo-200 text-xs mt-1">últimos 90 días</p>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg">
                            <ThermometerSun className="absolute right-3 top-3 w-8 h-8 opacity-20" />
                            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Índice bienestar</p>
                            <p className="text-3xl font-black tabular-nums mt-1">{stats.pctRegulada}%</p>
                            <p className="text-emerald-200 text-xs mt-1">clima regulada</p>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500 to-violet-600 p-5 text-white shadow-lg">
                            <TrendingUp className="absolute right-3 top-3 w-8 h-8 opacity-20" />
                            <p className="text-violet-100 text-xs font-semibold uppercase tracking-wider">Promedio energía</p>
                            <p className="text-3xl font-black tabular-nums mt-1">
                                {stats.avgGlobal != null ? stats.avgGlobal.toFixed(1) : "—"}
                            </p>
                            <p className="text-violet-200 text-xs mt-1">escala 1–4</p>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg">
                            <BarChart3 className="absolute right-3 top-3 w-8 h-8 opacity-20" />
                            <p className="text-amber-100 text-xs font-semibold uppercase tracking-wider">Predominante</p>
                            <p className="text-xl font-bold mt-1 truncate">
                                {stats.dominant ? (ENERGY_LABEL[stats.dominant]?.label ?? stats.dominant) : "—"}
                            </p>
                            <p className="text-amber-200 text-xs mt-1">tipo de clima</p>
                        </div>
                    </div>

                    {/* Distribución donut + Tendencia semanal */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-indigo-500" />
                                Distribución del clima
                            </h3>
                            {stats.pieData.length === 0 ? (
                                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={stats.pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={95}
                                            paddingAngle={2}
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {stats.pieData.map((entry, i) => (
                                                <Cell key={entry.name} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => [value, "Registros"]}
                                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Tendencia semanal (registros y promedio)
                            </h3>
                            {stats.weeklyTrend.every(w => w.registros === 0) ? (
                                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={stats.weeklyTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRegistros" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="semana" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <YAxis yAxisId="right" orientation="right" domain={[0, 4]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                            formatter={(value: number, name: string) => [
                                                name === "Registros" ? value : (typeof value === "number" ? value.toFixed(1) : value),
                                                name,
                                            ]}
                                        />
                                        <Area yAxisId="left" type="monotone" dataKey="registros" name="Registros" stroke="#6366f1" strokeWidth={2} fill="url(#colorRegistros)" />
                                        <Area yAxisId="right" type="monotone" dataKey="promedio" name="Promedio energía" stroke="#10b981" strokeWidth={2} fill="url(#colorPromedio)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Barras por curso + Días de la semana */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-violet-500" />
                                Promedio de clima por curso
                            </h3>
                            {stats.barCourseData.length === 0 ? (
                                <p className="text-sm text-slate-400 py-8">No hay registros por curso.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={Math.max(220, stats.barCourseData.length * 36)}>
                                    <BarChart data={stats.barCourseData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                            formatter={(value: number, _: any, props: any) => [
                                                `Promedio ${value.toFixed(1)} · ${props.payload.registros} registros`,
                                                "",
                                            ]}
                                        />
                                        <Bar dataKey="promedio" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-amber-500" />
                                Registros por día de la semana
                            </h3>
                            {stats.byDayOfWeek.every(d => d.registros === 0) ? (
                                <p className="text-sm text-slate-400 py-8">Sin registros en el período.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={stats.byDayOfWeek} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                            formatter={(value: number) => [value, "Registros"]}
                                        />
                                        <Bar dataKey="registros" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Docentes más activos */}
                    {stats.topTeachers.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-sky-500" />
                                Docentes que más registraron clima
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {stats.topTeachers.map((t, i) => (
                                    <div
                                        key={t.name + i}
                                        className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 min-w-0 max-w-full"
                                    >
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium text-slate-800">{t.name}</span>
                                            <span className="text-slate-500 text-sm">{t.count} registros</span>
                                        </div>
                                        {t.courseNames.length > 0 && (
                                            <p className="text-xs text-slate-500 mt-1.5 ml-9">
                                                Cursos: {t.courseNames.join(", ")}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabla resumen por curso (complemento) */}
                    {stats.byCourse.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 mb-4">Resumen por curso</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-500 text-left">
                                            <th className="pb-2 font-semibold">Curso</th>
                                            <th className="pb-2 font-semibold text-center">Registros</th>
                                            <th className="pb-2 font-semibold text-center">Promedio</th>
                                            <th className="pb-2 font-semibold text-left">Clima predominante</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.byCourse.map((c) => (
                                            <tr key={c.id} className="border-b border-slate-100">
                                                <td className="py-2.5 font-medium text-slate-800">{c.name}</td>
                                                <td className="py-2.5 text-center text-slate-600">{c.count}</td>
                                                <td className="py-2.5 text-center font-medium text-slate-700">{c.avg != null ? c.avg.toFixed(1) : "—"}</td>
                                                <td className={`py-2.5 font-medium ${c.dominant ? ENERGY_LABEL[c.dominant]?.color ?? "" : "text-slate-400"}`}>
                                                    {c.dominant ? ENERGY_LABEL[c.dominant]?.label : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Bloque de recomendaciones detalladas por curso ahora se ofrece vía asistente IA flotante */}
                </div>
            )}
        </div>
    )
}
