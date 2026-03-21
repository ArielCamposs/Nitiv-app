"use client"

import { useState, useTransition, useMemo, useRef } from "react"
import Link from "next/link"
import { createConvivenciaRecord, updateConvivenciaRecord } from "@/app/(dashboard)/registros-convivencia/actions"
import { buildConvivenciaPdf, buildConvivenciaStatsPdf } from "@/lib/pdf/convivencia-pdf"
import { loadInstitutionLogoForPdf, loadNitivLogoBase64 } from "@/lib/pdf/load-logos"
import { toast } from "sonner"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from "recharts"
import { ClipboardList, Plus, History, TrendingUp, TrendingDown, Minus, CheckCircle, ChevronDown, ChevronUp, Search, X, Mic, MicOff, BarChart3, Printer, Download, Edit, AlertCircle, Trophy, CalendarDays, Activity, MapPin, Users, Inbox, FileDown, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// ── Constants ──────────────────────────────────────────────────────────────────
const RECORD_TYPES: { value: string; label: string; color: string }[] = [
    { value: "pelea", label: "Pelea", color: "#f43f5e" }, // red
    { value: "fuga", label: "Fuga / Escapada", color: "#f97316" }, // orange
    { value: "daño_material", label: "Daño Material", color: "#eab308" }, // yellow
    { value: "amenaza", label: "Amenaza", color: "#8b5cf6" }, // purple
    { value: "acoso", label: "Acoso", color: "#ec4899" }, // pink
    { value: "consumo", label: "Consumo de Sustancias", color: "#14b8a6" }, // teal
    { value: "conflicto_grupal", label: "Conflicto Grupal", color: "#3b82f6" }, // blue
    { value: "otro", label: "Otro", color: "#94a3b8" }, // slate
]

/** Valor guardado en `type` para entrevista con apoderado (incluye legado sin "con"). */
const ENTREVISTA_APODERADO_LABEL = "Entrevista con el apoderado"
const LEGACY_ENTREVISTA_APODERADO = "Entrevista apoderado"

function isEntrevistaApoderadoType(t: string) {
    return t === ENTREVISTA_APODERADO_LABEL || t === LEGACY_ENTREVISTA_APODERADO
}

function normalizeConvivenciaTypeForUi(t: string) {
    return t === LEGACY_ENTREVISTA_APODERADO ? ENTREVISTA_APODERADO_LABEL : t
}

const SEVERITIES = [
    { value: "leve", label: "Leve", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    { value: "moderada", label: "Mediano", color: "bg-orange-100 text-orange-700 border-orange-300" },
    { value: "grave", label: "Grave", color: "bg-red-100 text-red-700 border-red-300" },
    { value: "gravisimo", label: "Gravísimo", color: "bg-red-200 text-red-800 border-red-400" },
]

/** Etiquetas de gravedad usadas en reg. de convivencia (Leve, Mediano, Grave, Gravísimo). */
const SEVERITY_LABELS: Record<string, string> = {
    leve: "Leve",
    moderada: "Mediano",
    grave: "Grave",
    gravisimo: "Gravísimo",
    "n/a": "No aplica",
}

const ACTIONS_OPTIONS = [
    "Entrevista con estudiante(s)",
    "Contención emocional",
    "Mediación / Resolución de conflictos",
    "Comunicación a apoderados (llamada/correo)",
    "Entrevista con apoderado",
    "Derivación externa",
    "Aplicación de medida disciplinaria",
]

const SEVERITY_COLORS: { [key: string]: string } = {
    leve: "bg-yellow-100 text-yellow-700",
    moderada: "bg-orange-100 text-orange-700",
    grave: "bg-red-100 text-red-700",
    gravisimo: "bg-red-200 text-red-800",
    "n/a": "bg-slate-100 text-slate-500",
}

const STATUS_LABELS: Record<string, { label: string; class: string; cardBorder: string }> = {
    seguimiento: { label: "En seguimiento", class: "bg-orange-100 text-orange-700 border-orange-200", cardBorder: "border-l-4 border-l-orange-500" },
    cerrado: { label: "Cerrada", class: "bg-slate-200 text-slate-700 border-slate-300", cardBorder: "border-l-4 border-l-slate-400" },
}

const HISTORY_STATUS_LABELS: Record<string, { label: string; class: string; cardBorder: string }> = {
    seguimiento: { label: "Derivado a Gestión de casos", class: "bg-orange-100 text-orange-700 border-orange-200", cardBorder: "border-l-4 border-l-orange-500" },
    cerrado: STATUS_LABELS.cerrado,
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Student {
    id: string
    name: string
    last_name: string
    rut?: string | null
    courses?: { name: string; section?: string } | null
}

interface StaffUser {
    id: string
    name: string
    last_name: string
    role: string
}

/** Etiqueta en español para el rol en listados de profesionales */
const STAFF_ROLE_LABELS: Record<string, string> = {
    docente: "Docente",
    director: "Director/a",
    dupla: "Dupla",
    convivencia: "Convivencia",
    inspector: "Inspector/a",
    utp: "UTP",
    admin: "Administración",
    centro_alumnos: "Centro de alumnos",
}

function staffSelectOptionLabel(u: StaffUser): string {
    const key = (u.role || "").trim().toLowerCase()
    const roleLabel = key ? (STAFF_ROLE_LABELS[key] ?? u.role) : ""
    return roleLabel ? `${u.last_name}, ${u.name} (${roleLabel})` : `${u.last_name}, ${u.name}`
}

interface InvolvedStudent {
    student_id: string
    students: { id: string; name: string; last_name: string; courses?: { name: string; section?: string } | null; course?: { name: string; section?: string } | null } | null
}

interface ConvivenciaRecord {
    id: string
    status: string
    event_title?: string | null
    responsable_id: string | null
    apoyo_id: string | null
    agreements: string | null
    type: string
    severity: string
    location: string | null
    description: string
    involved_count: number
    actions_taken: string[]
    resolved: boolean
    resolution_notes?: string | null
    incident_date: string
    convivencia_record_students?: InvolvedStudent[]
    student_cases?: any[]
}

interface Props {
    initialRecords: ConvivenciaRecord[]
    students: Student[]
    staffUsers: StaffUser[]
    reporterName: string
    institutionName?: string
    institutionLogoUrl?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getWeekKey(dateStr: string): string {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d)
    mon.setDate(diff)
    return mon.toLocaleDateString("es-CL", { day: "numeric", month: "short" })
}

function buildWeeklyChart(records: ConvivenciaRecord[]) {
    const weekMap: { [key: string]: number } = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i * 7)
        weekMap[getWeekKey(d.toISOString())] = 0
    }
    for (const r of records) {
        const key = getWeekKey(r.incident_date)
        if (key in weekMap) weekMap[key]++
    }
    return Object.entries(weekMap).map(([semana, casos]) => ({ semana, casos: casos as number }))
}

// ── Student Picker ─────────────────────────────────────────────────────────────
function StudentPicker({
    allStudents,
    selected,
    onChange,
    showAll = false,
}: {
    allStudents: Student[]
    selected: Student[]
    onChange: (s: Student[]) => void
    showAll?: boolean
}) {
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)

    const filtered = useMemo(() => {
        const available = allStudents.filter(s => !selected.find(x => x.id === s.id))
        if (!query.trim()) {
            // When a course is selected, show all students of that course
            return showAll ? available.slice(0, 30) : []
        }
        const q = query.toLowerCase()
        return available
            .filter(s =>
                `${s.name} ${s.last_name}`.toLowerCase().includes(q) ||
                (s.rut ?? "").toLowerCase().includes(q)
            )
            .slice(0, 12)
    }, [query, allStudents, selected, showAll])

    function pick(s: Student) {
        onChange([...selected, s])
        setQuery("")
        setOpen(false)
    }

    function remove(id: string) {
        onChange(selected.filter(s => s.id !== id))
    }

    return (
        <div>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    placeholder="Buscar por nombre o RUT..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {open && filtered.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {filtered.map(s => (
                            <button
                                type="button"
                                key={s.id}
                                onClick={() => pick(s)}
                                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2"
                            >
                                <span className="text-sm font-medium text-slate-800">
                                    {s.last_name}, {s.name}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {s.rut && <span className="text-xs text-slate-400">{s.rut}</span>}
                                    {(s.courses as any)?.name && (
                                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                            {(s.courses as any).name}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {selected.map(s => (
                        <span key={s.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                            {s.last_name}, {s.name}
                            <button type="button" onClick={() => remove(s.id)} className="hover:text-red-500 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Historial / Derivación ────────────────────────────────────────────────────
function HistoryCaseStatus({ record }: { record: ConvivenciaRecord }) {
    const status = (record.status ?? "").toLowerCase()
    const isDerivedToCases = status !== "cerrado" && status !== "cerrada"

    if (isDerivedToCases) {
        return (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">
                <p className="text-xs font-semibold text-orange-800">Derivado a Gestión de casos</p>
                <p className="text-xs text-orange-700 mt-1">
                    El seguimiento, las intervenciones y las medidas continúan en Gestión de casos. Este registro queda como antecedente en convivencia.
                </p>
            </div>
        )
    }

    if (record.resolution_notes) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">Cierre en convivencia</p>
                <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{record.resolution_notes}</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold text-slate-700">Cerrado en convivencia</p>
            <p className="text-xs text-slate-500 mt-1">
                Este registro fue cerrado desde convivencia y no requiere seguimiento en Gestión de casos.
            </p>
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ConvivenciaRecordsTabs({ initialRecords, students, staffUsers, reporterName, institutionName, institutionLogoUrl }: Props) {
    const [tab, setTab] = useState<"nuevo" | "historial" | "estadisticas">("nuevo")
    const [records, setRecords] = useState<ConvivenciaRecord[]>(initialRecords)
    const [pending, startTransition] = useTransition()
    const [createdRecord, setCreatedRecord] = useState<ConvivenciaRecord | null>(null)
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
    const [detailRecordId, setDetailRecordId] = useState<string | null>(null)
    const originalPayloadRef = useRef<any | null>(null)
    const originalIncidentDateInputRef = useRef<string | null>(null)

    // Filtros del historial (gravedad y estado)
    const [historialFilterSeverity, setHistorialFilterSeverity] = useState("")
    const [historialFilterStatus, setHistorialFilterStatus] = useState("")

    // Form state
    // En formulario nuevo, parte sin selección visual de estado ni gravedad
    const [status, setStatus] = useState("")
    const [responsableId, setResponsableId] = useState("")
    const [apoyoId, setApoyoId] = useState("")

    const [type, setType] = useState("")
    const [typeOther, setTypeOther] = useState("")
    const [severity, setSeverity] = useState("")
    const [location, setLocation] = useState("")
    const [description, setDescription] = useState("")
    const [agreements, setAgreements] = useState("")
    const [tituloDelEvento, setTituloDelEvento] = useState("")
    const [nextStep, setNextStep] = useState("")
    const [nextStepDate, setNextStepDate] = useState("")

    const entrevistaApoderado = isEntrevistaApoderadoType(type)

    function selectEventType(next: string) {
        const wasInterview = isEntrevistaApoderadoType(type)
        if (next !== "Otro") setTypeOther("")
        if (isEntrevistaApoderadoType(next)) {
            setSeverity("n/a")
            setLocation("")
        } else if (wasInterview && severity === "n/a") {
            setSeverity("moderada")
        }
        setType(next)
    }

    // Voice Dictation State
    const [isListening, setIsListening] = useState(false)
    const [listeningField, setListeningField] = useState<"description" | "agreements" | null>(null)

    const [selectedCourse, setSelectedCourse] = useState("")
    const [involvedStudents, setInvolvedStudents] = useState<Student[]>([])
    const [actions, setActions] = useState<string[]>([])
    const [otherAction, setOtherAction] = useState("")
    const [incidentDate, setIncidentDate] = useState(() => {
        const now = new Date()
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        return local.toISOString().slice(0, 16)
    })

    // Stats
    const last30 = useMemo(() => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        return records.filter((r: ConvivenciaRecord) => new Date(r.incident_date) >= cutoff)
    }, [records])

    const lastWeek = useMemo(() => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 7)
        return records.filter((r: ConvivenciaRecord) => new Date(r.incident_date) >= cutoff)
    }, [records])

    const prevWeek = useMemo(() => {
        const from = new Date()
        from.setDate(from.getDate() - 14)
        const to = new Date()
        to.setDate(to.getDate() - 7)
        return records.filter((r: ConvivenciaRecord) => {
            const d = new Date(r.incident_date)
            return d >= from && d < to
        })
    }, [records])

    const weekDiff = lastWeek.length - prevWeek.length
    const weekPct = prevWeek.length > 0 ? Math.abs(Math.round((weekDiff / prevWeek.length) * 100)) : null

    const topType = useMemo(() => {
        if (last30.length === 0) return null
        const counts: { [key: string]: number } = {}
        for (const r of last30) counts[r.type] = (counts[r.type] ?? 0) + 1
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        return RECORD_TYPES.find(t => t.value === top[0]) ?? null
    }, [last30])

    const weeklyData = useMemo(() => buildWeeklyChart(records), [records])

    const pieData = useMemo(() => {
        if (last30.length === 0) return []
        const counts: { [key: string]: number } = {}
        for (const r of last30) counts[r.type] = (counts[r.type] ?? 0) + 1

        // Use a set to detect duplicates from unknowns vs authentic 'otro's if needed, though they map to same name/color.
        return Object.entries(counts)
            .map(([value, count]) => {
                const typeInfo = RECORD_TYPES.find(t => t.value === value)
                return {
                    name: typeInfo?.label || "Otro",
                    value: count,
                    color: typeInfo?.color || "#94a3b8"
                }
            })
            // sum duplicates if any (e.g. "unknownType" and "otro" both rendering as "Otro")
            .reduce((acc, current) => {
                const existing = acc.find(item => item.name === current.name)
                if (existing) existing.value += current.value
                else acc.push(current)
                return acc
            }, [] as { name: string, value: number, color: string }[])
            .sort((a, b) => b.value - a.value)
            .slice(0, 5) // Top 5
    }, [last30])

    const topReincidentStudents = useMemo(() => {
        if (records.length === 0) return []
        const counts: { [id: string]: { id: string; name: string; last_name: string; count: number } } = {}
        for (const r of records) {
            for (const inv of r.convivencia_record_students || []) {
                const s = inv.students
                if (!s) continue
                if (!counts[s.id]) counts[s.id] = { id: s.id, name: s.name, last_name: s.last_name, count: 0 }
                counts[s.id].count++
            }
        }
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
    }, [records])

    const topActionsTaken = useMemo(() => {
        if (records.length === 0) return []
        const counts: { [action: string]: number } = {}
        for (const r of records) {
            for (const action of r.actions_taken || []) {
                counts[action] = (counts[action] || 0) + 1
            }
        }
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(x => ({ name: x[0], count: x[1] }))
    }, [records])

    const closureRate = useMemo(() => {
        if (records.length === 0) return 0
        const closed = records.filter(r => {
            const s = (r.status || "").toLowerCase()
            return s === "cerrado" || s === "cerrada" || r.resolved
        }).length
        return Math.round((closed / records.length) * 100)
    }, [records])

    const daysHeatmap = useMemo(() => {
        const daysTemplate = [
            { id: 1, name: "Lunes", count: 0 },
            { id: 2, name: "Martes", count: 0 },
            { id: 3, name: "Miércoles", count: 0 },
            { id: 4, name: "Jueves", count: 0 },
            { id: 5, name: "Viernes", count: 0 },
        ]

        for (const r of records) {
            const date = new Date(r.incident_date)
            const day = date.getDay()
            if (day >= 1 && day <= 5) {
                daysTemplate[day - 1].count++
            }
        }

        const maxCount = Math.max(...daysTemplate.map(d => d.count), 1)

        return daysTemplate.map(d => {
            const intensity = d.count / maxCount
            let color = "bg-slate-100 text-slate-400"
            if (intensity > 0) {
                if (intensity <= 0.33) color = "bg-indigo-100 text-indigo-700"
                else if (intensity <= 0.66) color = "bg-indigo-300 text-indigo-900 font-medium"
                else color = "bg-indigo-500 text-white font-semibold"
            }
            return { ...d, color }
        })
    }, [records])

    const severityDist = useMemo(() => {
        if (records.length === 0) return []
        const counts: Record<string, number> = { leve: 0, moderada: 0, grave: 0, gravisimo: 0 }

        for (const r of records) {
            const sev = r.severity as keyof typeof counts
            if (counts[sev] !== undefined) counts[sev]++
            else counts.moderada++
        }

        return [
            { label: "Leve", count: counts.leve, color: "bg-indigo-100", textColor: "text-indigo-700" },
            { label: "Mediano", count: counts.moderada, color: "bg-purple-100", textColor: "text-purple-700" },
            { label: "Grave", count: counts.grave, color: "bg-rose-100", textColor: "text-rose-700" },
            { label: "Gravísimo", count: counts.gravisimo, color: "bg-red-200", textColor: "text-red-700" },
        ]
    }, [records])

    // Estado de casos (en seguimiento / cerrada); legacy "abierto" cuenta como seguimiento
    const statusCounts = useMemo(() => {
        let seguimiento = 0
        let cerrados = 0
        for (const r of records) {
            const s = (r.status || "").toLowerCase()
            if (s === "cerrado" || s === "cerrada" || r.resolved) cerrados++
            else seguimiento++
        }
        return { seguimiento, cerrados }
    }, [records])

    // Lugares donde ocurren más casos (prevención y foco)
    const byLocation = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const r of records) {
            const loc = (r.location || "Sin especificar").trim()
            counts[loc] = (counts[loc] ?? 0) + 1
        }
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
    }, [records])

    // Promedio de involucrados por caso y distribución (individual vs grupal)
    const involvedStats = useMemo(() => {
        if (records.length === 0) return { avg: 0, soloUno: 0, dosOMas: 0 }
        let total = 0
        let soloUno = 0
        let dosOMas = 0
        for (const r of records) {
            const n = r.involved_count ?? 0
            total += n
            if (n <= 1) soloUno++
            else dosOMas++
        }
        return {
            avg: records.length > 0 ? Number((total / records.length).toFixed(1)) : 0,
            soloUno,
            dosOMas,
        }
    }, [records])

    // Tendencia: últimos 30 días vs 30 días anteriores
    const last30Prev = useMemo(() => {
        const from = new Date()
        from.setDate(from.getDate() - 60)
        const to = new Date()
        to.setDate(to.getDate() - 30)
        return records.filter((r: ConvivenciaRecord) => {
            const d = new Date(r.incident_date)
            return d >= from && d < to
        })
    }, [records])
    const trendVsPrev = last30.length > 0 && last30Prev.length > 0
        ? Math.round(((last30.length - last30Prev.length) / last30Prev.length) * 100)
        : null

    function toggleAction(a: string) {
        setActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
    }

    function toggleDictation(field: "description" | "agreements") {
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            toast.error("Tu navegador no soporta el dictado por voz (usa Chrome o Edge)")
            return
        }

        if (isListening && listeningField === field) {
            // Already listening on this field, stop it
            setIsListening(false)
            setListeningField(null)
            return
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.lang = "es-CL"
        recognition.interimResults = true
        recognition.continuous = true

        recognition.onstart = () => {
            setIsListening(true)
            setListeningField(field)
        }

        recognition.onresult = (event: any) => {
            let finalTranscript = ""
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + " "
                }
            }
            if (finalTranscript) {
                if (field === "description") {
                    setDescription(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + finalTranscript)
                } else {
                    setAgreements(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + finalTranscript)
                }
            }
        }

        recognition.onerror = (event: any) => {
            if (event.error === 'aborted' || event.error === 'no-speech') {
                setIsListening(false)
                setListeningField(null)
                return // Ignorar errores comunes de silencio o detención manual
            }

            if (event.error === 'network') {
                // Error transitorio de conectividad con el servicio de voz — no mostrar en consola
                toast.warning("Sin conexión con el servicio de dictado. Inténtalo de nuevo.")
                setIsListening(false)
                setListeningField(null)
                return
            }

            if (event.error === 'not-allowed') {
                toast.error("Permiso de micrófono denegado. Revisa la configuración de tu navegador.")
            } else {
                toast.error(`Error en dictado: ${event.error || "Desconocido"}`)
            }
            setIsListening(false)
            setListeningField(null)
        }

        recognition.onend = () => {
            setIsListening(false)
            setListeningField(null)
        }

        recognition.start()
    }

    /** Enriquece el registro con cursos de la lista de estudiantes cuando faltan en el anidado. */
    function enrichRecordWithCourses(record: ConvivenciaRecord): ConvivenciaRecord {
        const studentsById = new Map(students.map(st => [st.id, st]))
        const enriched = (record.convivencia_record_students ?? []).map(rs => {
            const st = rs.students
            if (!st) return rs
            const courseData = st.courses ?? st.course ?? studentsById.get(st.id)?.courses
            if (!courseData) return rs
            return { ...rs, students: { ...st, courses: courseData } }
        })
        return { ...record, convivencia_record_students: enriched }
    }

    async function getLogos() {
        const [logoInst, logoNitiv] = await Promise.all([
            institutionLogoUrl ? loadInstitutionLogoForPdf(institutionLogoUrl) : Promise.resolve(null),
            loadNitivLogoBase64(),
        ])
        return { logoInst, logoNitiv }
    }

    function handlePrint(record: ConvivenciaRecord) {
        getLogos().then(({ logoInst, logoNitiv }) => {
            const doc = buildConvivenciaPdf(enrichRecordWithCourses(record), reporterName, institutionName, logoInst, logoNitiv)
            doc.autoPrint()
            doc.output("dataurlnewwindow")
        }).catch(() => {
            const doc = buildConvivenciaPdf(enrichRecordWithCourses(record), reporterName, institutionName)
            doc.autoPrint()
            doc.output("dataurlnewwindow")
        })
    }

    function handleDownloadPdf(record: ConvivenciaRecord) {
        getLogos().then(({ logoInst, logoNitiv }) => {
            const doc = buildConvivenciaPdf(enrichRecordWithCourses(record), reporterName, institutionName, logoInst, logoNitiv)
            doc.save(`registro-convivencia-${record.type || "caso"}.pdf`)
        }).catch(() => {
            const doc = buildConvivenciaPdf(enrichRecordWithCourses(record), reporterName, institutionName)
            doc.save(`registro-convivencia-${record.type || "caso"}.pdf`)
        })
    }

    function getStatsPdfData() {
        return {
            institutionName,
            statusCounts: { seguimiento: statusCounts.seguimiento, cerrados: statusCounts.cerrados },
            last30: last30.length,
            lastWeek: lastWeek.length,
            weekPct: weekPct,
            weekDiff: weekDiff,
            topTypeLabel: topType?.label ?? null,
            gravesLast30: last30.filter(r => r.severity === "grave").length,
            resolutionRate: closureRate,
            resolvedCount: statusCounts.cerrados,
            totalRecords: records.length,
            trendVsPrev: trendVsPrev,
            severityDist: severityDist.map(s => ({ label: s.label, count: s.count })),
            daysHeatmap: daysHeatmap.map(d => ({ name: d.name, count: d.count })),
            byLocation: byLocation.map(l => ({ name: l.name, count: l.count })),
            involvedStats: { avg: involvedStats.avg, soloUno: involvedStats.soloUno, dosOMas: involvedStats.dosOMas },
            weeklyData: weeklyData.map(w => ({ semana: w.semana, casos: w.casos })),
            pieData: pieData.map(p => ({ name: p.name, value: p.value })),
            topReincidentStudents: topReincidentStudents.map(s => ({ name: s.name, last_name: s.last_name, count: s.count })),
            topActionsTaken: topActionsTaken.map(a => ({ name: a.name, count: a.count })),
        }
    }

    function handleDownloadStatsPdf() {
        getLogos()
            .then(({ logoInst, logoNitiv }) => {
                const data = getStatsPdfData()
                const doc = buildConvivenciaStatsPdf(data, logoInst, logoNitiv)
                doc.save(`estadisticas-convivencia-${new Date().toISOString().slice(0, 10)}.pdf`)
                toast.success("PDF descargado")
            })
            .catch((e) => {
                console.error(e)
                toast.error("No se pudo generar el PDF")
            })
    }

    function handlePrintStats() {
        getLogos()
            .then(({ logoInst, logoNitiv }) => {
                const data = getStatsPdfData()
                const doc = buildConvivenciaStatsPdf(data, logoInst, logoNitiv)
                doc.autoPrint()
                doc.output("dataurlnewwindow")
                toast.success("Abriendo impresión...")
            })
            .catch((e) => {
                console.error(e)
                toast.error("No se pudo abrir la impresión")
            })
    }

    function handleEdit(record: ConvivenciaRecord) {
        setEditingRecordId(record.id)
        const s = (record.status || "").toLowerCase()
        setStatus(s === "cerrado" || s === "cerrada" ? "cerrado" : "seguimiento")
        setResponsableId(record.responsable_id || "")
        setApoyoId(record.apoyo_id || "")
        if (record.type === "Otro" || record.type.startsWith("Otro:")) {
            setType("Otro")
            setTypeOther(record.type.startsWith("Otro:") ? record.type.slice(6).trim() : "")
        } else {
            setType(normalizeConvivenciaTypeForUi(record.type || ""))
            setTypeOther("")
        }
        setSeverity(record.severity || "moderada")
        setLocation(record.location || "")
        setTituloDelEvento(record.event_title ?? "")
        if (!(record.type === "Otro" || record.type.startsWith("Otro:")) && isEntrevistaApoderadoType(normalizeConvivenciaTypeForUi(record.type || ""))) {
            setSeverity("n/a")
            setLocation("")
        }
        setDescription(record.description || "")
        setAgreements(record.agreements || "")

        // Convert associated students
        const studentsList = (record.convivencia_record_students ?? []).map(s => s.students).filter(Boolean) as any
        setInvolvedStudents(studentsList)

        // Pre-select course based on first student if available
        if (studentsList.length > 0 && studentsList[0].courses?.name) {
            setSelectedCourse(studentsList[0].courses.name)
        } else {
            setSelectedCourse("")
        }

        setActions(record.actions_taken || [])

        // Format date for datetime-local
        if (record.incident_date) {
            const d = new Date(record.incident_date)
            const offset = d.getTimezoneOffset()
            const local = new Date(d.getTime() - (offset * 60 * 1000))
            const inputValue = local.toISOString().slice(0, 16)
            setIncidentDate(inputValue)
            originalIncidentDateInputRef.current = inputValue
        } else {
            originalIncidentDateInputRef.current = null
        }

        // Guardar snapshot original para detectar si no se hicieron cambios
        try {
            const originalParsedDate = record.incident_date ? new Date(record.incident_date).toISOString() : null
            originalPayloadRef.current = {
                status: record.status,
                event_title: (record.event_title || "").trim(),
                responsable_id: record.responsable_id || null,
                apoyo_id: record.apoyo_id || null,
                agreements: (record.agreements || "").trim(),
                type: record.type,
                severity: record.severity,
                location: (record.location || "").trim(),
                description: (record.description || "").trim(),
                involved_count: Math.max((record.convivencia_record_students ?? []).length, 1),
                student_ids: (record.convivencia_record_students ?? [])
                    .map(s => s.students?.id)
                    .filter(Boolean),
                actions_taken: record.actions_taken || [],
                incident_date: originalParsedDate,
            }
        } catch {
            originalPayloadRef.current = null
        }

        setTab("nuevo")
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!type) { toast.error("Selecciona el tipo de caso"); return }
        if (!description.trim()) { toast.error("La descripción es obligatoria"); return }
        if (involvedStudents.length === 0) {
            toast.error("Debes asociar al menos un estudiante al caso.")
            return
        }

        const allActions = [...actions, ...(otherAction.trim() ? [otherAction.trim()] : [])]
        const parsedDate = new Date(incidentDate).toISOString()
        const statusToSave = status === "cerrado" ? "cerrado" : "seguimiento"
        const interviewType = isEntrevistaApoderadoType(type)
        const severityToSave = interviewType ? "n/a" : severity
        const locationToSave = interviewType ? "" : location.trim()

        const payload = {
            status: statusToSave,
            event_title: tituloDelEvento.trim(),
            responsable_id: responsableId || null,
            apoyo_id: apoyoId || null,
            agreements: agreements.trim(),
            type: (type === "Otro" && typeOther.trim()) ? `Otro: ${typeOther.trim()}` : type,
            severity: severityToSave,
            location: locationToSave,
            description: description.trim(),
            involved_count: Math.max(involvedStudents.length, 1),
            student_ids: involvedStudents.map(s => s.id),
            actions_taken: allActions,
            incident_date: parsedDate,
            ...(statusToSave === "seguimiento" && {
                next_step: nextStep.trim() || null,
                next_step_date: nextStepDate || null,
                derived_to: ["dupla", "convivencia"],
            }),
        }

        // Si está en edición y nada cambió, avisar y no guardar
        if (editingRecordId && originalPayloadRef.current) {
            try {
                const prev = JSON.stringify(originalPayloadRef.current)
                const next = JSON.stringify(payload)
                if (prev === next) {
                    toast.error("No has modificado ningún dato de este registro.")
                    return
                }
            } catch {
                // si falla comparación, seguimos normalmente
            }

            // Además, si al editar dejaste exactamente la misma fecha/hora, pedir confirmación explícita
            if (typeof window !== "undefined" && originalIncidentDateInputRef.current) {
                if (incidentDate === originalIncidentDateInputRef.current) {
                    const keepSameDate = window.confirm(
                        "No has cambiado la fecha y hora del incidente.\n\n" +
                        "¿Confirmas que quieres mantener la misma fecha que tenía el registro?"
                    )
                    if (!keepSameDate) {
                        return
                    }
                }
            }
        }

        startTransition(async () => {
            let result
            if (editingRecordId) {
                result = await updateConvivenciaRecord(editingRecordId, payload)
            } else {
                result = await createConvivenciaRecord(payload)
            }

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success(editingRecordId ? "Registro actualizado correctamente" : "Registro creado correctamente")
                if ((result as { warning?: string })?.warning) {
                    toast.warning((result as { warning: string }).warning)
                }

                // limpiar snapshot después de guardar
                originalPayloadRef.current = null

                // Optimistic update
                const typeToSave = (type === "Otro" && typeOther.trim()) ? `Otro: ${typeOther.trim()}` : type
                const newRecord: ConvivenciaRecord = {
                    id: editingRecordId || (result as any).id || crypto.randomUUID(),
                    type: typeToSave,
                    event_title: tituloDelEvento.trim() || null,
                    severity: severityToSave,
                    location: locationToSave || null,
                    description: description.trim(),
                    agreements: agreements.trim() || null,
                    involved_count: Math.max(involvedStudents.length, 1),
                    actions_taken: allActions,
                    status: statusToSave,
                    resolved: editingRecordId ? records.find(r => r.id === editingRecordId)?.resolved ?? false : false,
                    resolution_notes: editingRecordId ? records.find(r => r.id === editingRecordId)?.resolution_notes ?? null : null,
                    incident_date: parsedDate,
                    convivencia_record_students: involvedStudents.map(s => ({
                        student_id: s.id,
                        students: { id: s.id, name: s.name, last_name: s.last_name },
                    })),
                    student_cases: statusToSave === "seguimiento" ? [{ next_step: nextStep.trim() || null, next_step_date: nextStepDate || null }] : [],
                } as any // using as any to ignore strict DB typing matching for optimistic updates

                if (editingRecordId) {
                    setRecords(prev => prev.map(r => r.id === editingRecordId ? { ...r, ...newRecord } : r))
                    setTab("historial")
                    setEditingRecordId(null)
                    // Reset
                    setStatus(""); setResponsableId(""); setApoyoId("")
                    setType(""); setTypeOther(""); setSeverity("moderada"); setLocation("")
                    setTituloDelEvento("")
                    setDescription(""); setAgreements(""); setInvolvedStudents([])
                    setSelectedCourse(""); setActions([]); setOtherAction("")
                    setIncidentDate(new Date().toISOString().slice(0, 16))
                } else {
                    setRecords(prev => [newRecord, ...prev])
                    setCreatedRecord(newRecord)
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { key: "nuevo", label: editingRecordId ? "Editar Registro" : "Nuevo Registro", icon: editingRecordId ? Edit : Plus },
                    { key: "historial", label: "Historial", icon: History },
                    { key: "estadisticas", label: "Estadísticas", icon: BarChart3 },
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key as "nuevo" | "historial" | "estadisticas")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"}`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                        {key === "historial" && records.length > 0 && (
                            <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs rounded-full px-1.5 py-0.5 font-semibold">
                                {records.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── FORM ── */}
            {tab === "nuevo" && createdRecord && (
                <div className="bg-white rounded-3xl border shadow-sm p-10 text-center space-y-6 max-w-xl mx-auto mt-8">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">¡Registro creado exitosamente!</h2>
                        <p className="text-slate-500 mt-2 text-sm">El caso ha sido guardado y ya forma parte del historial de convivencia.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                        <button type="button" onClick={() => handleDownloadPdf(createdRecord)}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors w-full sm:w-auto">
                            <Download className="w-4 h-4" /> Descargar PDF
                        </button>
                        <button type="button" onClick={() => handlePrint(createdRecord)}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors w-full sm:w-auto">
                            <Printer className="w-4 h-4" /> Imprimir
                        </button>
                    </div>
                    <div className="pt-2 border-t mt-6 border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setCreatedRecord(null)
                                // Reset form para crear otro caso de inmediato
                                setStatus(""); setResponsableId(""); setApoyoId("")
                                setType(""); setTypeOther(""); setSeverity(""); setLocation("")
                                setTituloDelEvento("")
                                setDescription(""); setAgreements(""); setInvolvedStudents([])
                                setSelectedCourse(""); setActions([]); setOtherAction("")
                                setIncidentDate(new Date().toISOString().slice(0, 16))
                                setTab("nuevo")
                            }}
                            className="text-indigo-600 font-semibold hover:underline text-sm"
                        >
                            Crear otro caso
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setCreatedRecord(null)
                                // Reset básico al volver al historial
                                setStatus(""); setResponsableId(""); setApoyoId("")
                                setType(""); setTypeOther(""); setSeverity(""); setLocation("")
                                setTituloDelEvento("")
                                setDescription(""); setAgreements(""); setInvolvedStudents([])
                                setSelectedCourse(""); setActions([]); setOtherAction("")
                                setIncidentDate(new Date().toISOString().slice(0, 16))
                                setTab("historial")
                            }}
                            className="text-slate-500 font-semibold hover:underline text-sm"
                        >
                            Volver al historial
                        </button>
                    </div>
                </div>
            )}
            {tab === "nuevo" && !createdRecord && (
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl border shadow-sm p-8 space-y-10">

                    {/* Fecha y hora del incidente */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-start w-full">
                        <span className="text-sm font-semibold text-slate-700 shrink-0">Fecha y hora</span>
                        <input type="datetime-local" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-auto"
                        />
                    </div>

                    {/* Tipo de evento */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Tipo de evento</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                <select value={type} onChange={e => selectEventType(e.target.value)}
                                    className="w-full sm:w-64 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                    <option value="">Seleccione tipo...</option>
                                    {RECORD_TYPES.filter(t => t.value !== "otro").map(t => <option key={t.value} value={t.label}>{t.label}</option>)}
                                    <option value="Apoyo emocional">Apoyo emocional</option>
                                    <option value={ENTREVISTA_APODERADO_LABEL}>{ENTREVISTA_APODERADO_LABEL}</option>
                                    <option value="Incumplimiento de normas">Incumplimiento de normas</option>
                                    {RECORD_TYPES.filter(t => t.value === "otro").map(t => <option key={t.value} value={t.label}>{t.label}</option>)}
                                </select>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-slate-400">Frecuentes:</span>
                                    {[
                                        { label: "Apoyo emocional" },
                                        { label: ENTREVISTA_APODERADO_LABEL },
                                        { label: "Incumplimiento de normas" },
                                    ].map(shortcut => (
                                        <button key={shortcut.label} type="button"
                                            onClick={() => selectEventType(shortcut.label)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                                type === shortcut.label
                                                    ? "bg-indigo-500 text-white border-indigo-500 shadow-sm ring-2 ring-indigo-200"
                                                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                                }`}
                                        >{shortcut.label}</button>
                                    ))}
                                </div>
                            </div>
                            {type === "Otro" && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Especifique el tipo de evento</label>
                                    <input type="text" value={typeOther} onChange={e => setTypeOther(e.target.value)}
                                        placeholder="Ej: Situación no categorizada..."
                                        className="w-full sm:max-w-md rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Título del evento */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200 relative z-20">
                        <label htmlFor="convivencia-titulo-evento" className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                            Título del evento
                        </label>
                        <p className="text-[11px] text-slate-400 mb-2">Texto breve para identificar el caso en el historial.</p>
                        <input
                            id="convivencia-titulo-evento"
                            name="convivencia_titulo_evento"
                            type="text"
                            value={tituloDelEvento}
                            onChange={e => setTituloDelEvento(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") e.preventDefault()
                            }}
                            placeholder="Ej. Discusión en patio, mediación con apoderado..."
                            maxLength={200}
                            autoComplete="off"
                            className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {/* ── Row 1: Profesionales | Lugar | Gravedad ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                        {/* Profesionales */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200 space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Profesionales</h3>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Responsable</label>
                                <select value={responsableId} onChange={e => setResponsableId(e.target.value)}
                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                    <option value="">Seleccione...</option>
                                    {staffUsers.map(u => <option key={u.id} value={u.id}>{staffSelectOptionLabel(u)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Apoyo</label>
                                <select value={apoyoId} onChange={e => setApoyoId(e.target.value)}
                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                    <option value="">Ninguno</option>
                                    {staffUsers.map(u => <option key={u.id} value={u.id}>{staffSelectOptionLabel(u)}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Lugar del evento */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Lugar del evento</h3>
                            {entrevistaApoderado && (
                                <p className="text-[11px] text-slate-500 mb-2">No aplica para entrevista con el apoderado.</p>
                            )}
                            <div className={`flex flex-wrap gap-2 ${entrevistaApoderado ? "pointer-events-none opacity-40" : ""}`}>
                                {["Patio", "Aula", "Baño", "Comedor", "Redes sociales", "Fuera del colegio"].map(loc => (
                                    <button key={loc} type="button"
                                        onClick={() => setLocation(prev => prev === loc ? "" : loc)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${location === loc
                                            ? "bg-indigo-500 text-white border-indigo-500 shadow-sm ring-2 ring-indigo-200"
                                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                            }`}
                                    >{loc}</button>
                                ))}
                            </div>
                        </div>

                        {/* Gravedad */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Gravedad</h3>
                            {entrevistaApoderado && (
                                <p className="text-[11px] text-slate-500 mb-2">No aplica para entrevista con el apoderado.</p>
                            )}
                            <div className={`flex flex-wrap gap-2 ${entrevistaApoderado ? "pointer-events-none opacity-40" : ""}`}>
                                {[
                                    // Verde (baja intensidad)
                                    { value: "leve", label: "Leve", activeClass: "bg-emerald-500 text-white border-emerald-500 shadow-md ring-2 ring-emerald-200" },
                                    // Amarillo (media)
                                    { value: "moderada", label: "Mediano", activeClass: "bg-amber-400 text-white border-amber-400 shadow-md ring-2 ring-amber-200" },
                                    // Rojo claro
                                    { value: "grave", label: "Grave", activeClass: "bg-rose-400 text-white border-rose-400 shadow-md ring-2 ring-rose-200" },
                                    // Rojo más intenso
                                    { value: "gravisimo", label: "Gravísimo", activeClass: "bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-200" },
                                ].map(s => (
                                    <button
                                        type="button"
                                        key={s.value}
                                        onClick={() => setSeverity(prev => (prev === s.value ? "" : s.value))}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                            severity === s.value
                                                ? s.activeClass
                                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Row 2: Curso | Estudiantes ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Curso */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Curso</h3>
                            {(() => {
                                const courseNames = Array.from(new Set(
                                    students.map(s => (s.courses as any)?.name).filter(Boolean)
                                )).sort() as string[]
                                const isMedia = (name: string) =>
                                    /medio|media|1°m|2°m|3°m|4°m|i medio|ii medio|iii medio|iv medio/i.test(name)
                                const basica = courseNames.filter(n => !isMedia(n))
                                const media = courseNames.filter(n => isMedia(n))
                                const renderGroup = (label: string, items: string[]) => items.length === 0 ? null : (
                                    <div key={label} className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
                                        {items.map(name => (
                                            <button key={name} type="button"
                                                onClick={() => setSelectedCourse(prev => prev === name ? "" : name)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${selectedCourse === name
                                                    ? "bg-indigo-500 text-white border-indigo-500 shadow-sm ring-2 ring-indigo-200"
                                                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                                    }`}
                                            >{name}</button>
                                        ))}
                                    </div>
                                )
                                return (
                                    <div className="flex flex-col gap-3">
                                        {renderGroup("Básica", basica)}
                                        {basica.length > 0 && media.length > 0 && <div className="border-t border-slate-200" />}
                                        {renderGroup("Media", media)}
                                        {courseNames.length === 0 && <span className="text-xs text-slate-400">No hay cursos disponibles</span>}
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Estudiantes Involucrados */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Estudiantes Involucrados</h3>
                            <StudentPicker
                                allStudents={selectedCourse ? students.filter(s => (s.courses as any)?.name === selectedCourse) : students}
                                selected={involvedStudents}
                                onChange={setInvolvedStudents}
                                showAll={!!selectedCourse}
                            />
                        </div>
                    </div>

                    {/* ── Descripción + Acuerdos lado a lado ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Descripción */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                                Descripción del evento <span className="text-red-500">*</span>
                            </h3>
                            <div className="relative">
                                <textarea rows={6} value={description} onChange={e => setDescription(e.target.value)}
                                    placeholder="Describe detalladamente qué ocurrió, quiénes participaron y el contexto..."
                                    maxLength={5000}
                                    className="w-full rounded-xl bg-white border border-slate-200 p-3 pb-12 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shadow-sm"
                                />
                                <div className="absolute bottom-3 left-3 text-[10px] text-slate-400">
                                    {description.length} / 5000
                                </div>
                                <button type="button" onClick={() => toggleDictation("description")}
                                    className={`absolute bottom-3 right-3 p-2.5 rounded-full transition-all ${isListening && listeningField === "description"
                                        ? "bg-red-500 text-white shadow-md animate-pulse"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                    {isListening && listeningField === "description" ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Acuerdos */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                                Acuerdos y Resolución
                            </h3>
                            <div className="relative">
                                <textarea rows={6} value={agreements} onChange={e => setAgreements(e.target.value)}
                                    placeholder="Enumere los acuerdos o decisiones tomadas si aplica..."
                                    maxLength={3000}
                                    className="w-full rounded-xl bg-white border border-slate-200 p-3 pb-12 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shadow-sm"
                                />
                                <div className="absolute bottom-3 left-3 text-[10px] text-slate-400">
                                    {agreements.length} / 3000
                                </div>
                                <button type="button" onClick={() => toggleDictation("agreements")}
                                    className={`absolute bottom-3 right-3 p-2.5 rounded-full transition-all ${isListening && listeningField === "agreements"
                                        ? "bg-red-500 text-white shadow-md animate-pulse"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                    {isListening && listeningField === "agreements" ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Gestión y acciones ── */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Gestión y acciones inmediatas</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ACTIONS_OPTIONS.map(a => (
                                <label key={a} className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${actions.includes(a) ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300"}`}>
                                        {actions.includes(a) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" checked={actions.includes(a)} onChange={() => toggleAction(a)} className="hidden" />
                                    <span className="text-sm font-medium text-slate-700">{a}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Estado del evento (al final del formulario) */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                        <span className="text-sm font-semibold text-slate-700">Estado del evento</span>
                        <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                            Si eliges &quot;En seguimiento&quot;, se crearán casos en Gestión de casos para dar seguimiento.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-full border border-slate-200 w-fit">
                            {[
                                { value: "seguimiento", label: "En seguimiento", activeClass: "bg-orange-500 text-white shadow-md ring-2 ring-orange-200 border-orange-500" },
                                { value: "cerrado", label: "Cerrado", activeClass: "bg-red-500 text-white shadow-md ring-2 ring-red-200 border-red-500" },
                            ].map(s => (
                                <button
                                    type="button"
                                    key={s.value}
                                    onClick={() => setStatus(prev => (prev === s.value ? "" : s.value))}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                        status === s.value
                                            ? s.activeClass
                                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {status === "seguimiento" && (
                        <div className="bg-violet-50/80 p-5 rounded-2xl border-2 border-violet-200">
                            <h3 className="text-sm font-bold text-violet-900 mb-1 flex items-center gap-2">
                                <ClipboardList className="w-4 h-4" />
                                Datos para Gestión de casos
                            </h3>
                            <p className="text-xs text-violet-700/90 mb-4">
                                Este registro se enviará al historial de Gestión de casos. Completa los datos para el seguimiento.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Próximo paso</label>
                                    <input
                                        type="text"
                                        value={nextStep}
                                        onChange={e => setNextStep(e.target.value)}
                                        placeholder="Ej. Reunión con apoderado, seguimiento en 2 semanas..."
                                        className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha del próximo paso</label>
                                    <input
                                        type="date"
                                        value={nextStepDate}
                                        onChange={e => setNextStepDate(e.target.value)}
                                        className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        <button type="submit" disabled={pending}
                            className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {pending ? "Guardando..." : editingRecordId ? "Guardar Cambios" : "Registrar Caso"}
                        </button>
                        {editingRecordId && (
                            <button type="button" disabled={pending} onClick={() => {
                                setEditingRecordId(null)
                                setStatus(""); setResponsableId(""); setApoyoId("")
                                setType(""); setTypeOther(""); setSeverity("moderada"); setLocation("")
                                setTituloDelEvento("")
                                setDescription(""); setAgreements(""); setInvolvedStudents([])
                                setSelectedCourse(""); setActions([]); setOtherAction("")
                                setIncidentDate(new Date().toISOString().slice(0, 16))
                                setNextStep(""); setNextStepDate("")
                                setTab("historial")
                            }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors flex-1 sm:flex-none text-center">
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            )}

            {/* ── ESTADÍSTICAS ── */}
            {tab === "estadisticas" && (
                <div className="space-y-6">
                    {/* Acciones: Descargar PDF e Imprimir */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-600">Exportar informe</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleDownloadStatsPdf}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                <FileDown className="w-4 h-4" />
                                Descargar PDF
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintStats}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </button>
                        </div>
                    </div>

                    {/* Estado de casos (seguimiento / cerrados) */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Inbox className="w-3.5 h-3.5" /> Estado de casos (período)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-xl border border-orange-200/80 p-4 shadow-sm">
                                <p className="text-[10px] font-semibold text-orange-700 uppercase tracking-wide">En seguimiento</p>
                                <p className="text-2xl font-bold text-orange-700 mt-0.5">{statusCounts.seguimiento}</p>
                                <p className="text-xs text-slate-500 mt-0.5">En proceso</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Cerrados</p>
                                <p className="text-2xl font-bold text-slate-700 mt-0.5">{statusCounts.cerrados}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Resueltos</p>
                            </div>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Últimos 30 días</p>
                            <p className="text-3xl font-bold text-slate-800 mt-1">{last30.length}</p>
                            <p className="text-xs text-slate-400 mt-1">casos registrados</p>
                            {trendVsPrev !== null && (
                                <p className={`text-[10px] font-medium mt-1 ${trendVsPrev >= 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {trendVsPrev >= 0 ? "+" : ""}{trendVsPrev}% vs 30 días anteriores
                                </p>
                            )}
                        </div>
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Esta semana</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <p className="text-3xl font-bold text-slate-800">{lastWeek.length}</p>
                                {weekDiff > 0 && <TrendingUp className="w-5 h-5 text-red-500" />}
                                {weekDiff < 0 && <TrendingDown className="w-5 h-5 text-emerald-500" />}
                                {weekDiff === 0 && <Minus className="w-5 h-5 text-slate-400" />}
                            </div>
                            <p className="text-xs mt-1">
                                {weekPct !== null
                                    ? <span className={weekDiff > 0 ? "text-red-500" : "text-emerald-500"}>{weekDiff > 0 ? "+" : "-"}{weekPct}% vs semana pasada</span>
                                    : <span className="text-slate-400">Sin datos previos</span>}
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Tipo más frecuente</p>
                            {topType
                                ? <p className="text-sm font-semibold text-slate-700 mt-2">{topType.label}</p>
                                : <p className="text-slate-400 text-sm mt-1">Sin datos</p>}
                        </div>
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Casos graves</p>
                            <p className="text-3xl font-bold text-red-600 mt-1">{last30.filter(r => r.severity === "grave").length}</p>
                            <p className="text-xs text-slate-400 mt-1">últimos 30 días</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Weekly Timeline */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6 lg:col-span-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4">Evolución de casos (últimas 6 semanas)</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={weeklyData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCasos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                        formatter={(v) => [v, "Casos"]}
                                    />
                                    <Area type="monotone" dataKey="casos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCasos)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Types Donut Chart */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6 lg:col-span-1 flex flex-col items-center">
                            <h3 className="text-sm font-semibold text-slate-700 w-full mb-2">Distribución (30 días)</h3>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={50}
                                            outerRadius={75}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400">Sin datos registrados</div>
                            )}
                            <div className="w-full space-y-1.5 mt-2 max-h-[80px] overflow-y-auto pr-1">
                                {pieData.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-slate-600 truncate max-w-[120px]" title={entry.name}>{entry.name}</span>
                                        </div>
                                        <span className="font-semibold text-slate-700">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Insights avanzados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* 1. Tasa de cierre */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col items-center justify-center text-center">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">Tasa de cierre</h3>
                            <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-8 border-slate-50">
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-slate-100"
                                        strokeWidth="3.8"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-emerald-500"
                                        strokeWidth="3.8"
                                        strokeDasharray={`${closureRate}, 100`}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-slate-800">{closureRate}%</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-4">
                                {statusCounts.cerrados} de {records.length} registros cerrados
                            </p>
                        </div>

                        {/* 2. Distribución por Gravedad */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6 pl-5">
                            <h3 className="text-sm font-semibold text-slate-700 mb-5">Distribución de Gravedad</h3>
                            <div className="space-y-4">
                                {severityDist.map(s => {
                                    const pct = records.length > 0 ? Math.round((s.count / records.length) * 100) : 0
                                    return (
                                        <div key={s.label}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className={`font-medium ${s.textColor}`}>{s.label}</span>
                                                <span className="text-slate-500">{s.count} ({pct}%)</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${s.color.replace('bg-', 'bg-').replace('-100', '-500').replace('-200', '-600')}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 3. Días Críticos */}
                        <div className="bg-white rounded-2xl border shadow-sm p-5 flex flex-col">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-indigo-500" />
                                Mapa de Días (Lun - Vie)
                            </h3>
                            <div className="flex-1 flex items-center justify-center gap-2 mt-2">
                                {daysHeatmap.map(d => (
                                    <div key={d.id} className="flex flex-col items-center gap-2">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition-colors ${d.color}`} title={`${d.count} casos`}>
                                            {d.count > 0 ? d.count : "-"}
                                        </div>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase">{d.name.slice(0, 2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3b. Lugares más frecuentes — prevención y foco */}
                        <div className="bg-white rounded-2xl border shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-rose-500" />
                                Lugares donde ocurren más casos
                            </h3>
                            {byLocation.length === 0 ? (
                                <p className="text-sm text-slate-400 py-4">Sin datos de lugar.</p>
                            ) : (
                                <div className="space-y-2">
                                    {byLocation.map((loc) => {
                                        const pct = records.length > 0 ? Math.round((loc.count / records.length) * 100) : 0
                                        return (
                                            <div key={loc.name} className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-medium text-slate-700 truncate" title={loc.name}>{loc.name}</span>
                                                <span className="text-xs text-slate-500 shrink-0">{loc.count} ({pct}%)</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 3c. Involucrados por caso — individual vs grupal */}
                        <div className="bg-white rounded-2xl border shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-violet-500" />
                                Involucrados por caso
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-slate-800">{involvedStats.avg}</span>
                                    <span className="text-xs text-slate-500">promedio de personas por caso</span>
                                </div>
                                <div className="flex gap-3 text-xs">
                                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                                        1 involucrado: {involvedStats.soloUno}
                                    </span>
                                    <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                                        2 o más: {involvedStats.dosOMas}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Top Estudiantes Reincidentes */}
                        <div className="bg-white rounded-2xl border shadow-sm p-5 md:col-span-2 lg:col-span-1">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                Estudiantes Reincidentes
                            </h3>
                            {topReincidentStudents.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">Sin reincidencias</p>
                            ) : (
                                <div className="space-y-3">
                                    {topReincidentStudents.map((st, i) => (
                                        <Link
                                            key={st.id}
                                            href={`/perfil/${st.id}`}
                                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-red-100 text-red-600" :
                                                    i === 1 ? "bg-orange-100 text-orange-600" :
                                                        "bg-slate-200 text-slate-500"
                                                    }`}>
                                                    {i + 1}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{st.last_name}, {st.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                                                {st.count} casos
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 5. Acciones Más Frecuentes */}
                        <div className="bg-white rounded-2xl border shadow-sm p-5 md:col-span-2 lg:col-span-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <div className="relative flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-emerald-500 animate-pulse drop-shadow-md z-10" />
                                    <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
                                </div>
                                Medidas y Acciones Frecuentes
                            </h3>
                            {topActionsTaken.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 h-32">
                                    Sin acciones registradas
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                    {topActionsTaken.map((a, i) => (
                                        <div key={a.name} className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-colors hover:bg-slate-100 min-h-[110px]">
                                            <span className="text-sm font-medium text-slate-700 text-center mb-3 leading-tight line-clamp-3" title={a.name}>{a.name}</span>
                                            <span className="text-xs font-semibold text-slate-500 mt-auto bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{a.count} veces</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* ── HISTORIAL ── */}
            {tab === "historial" && (
                <div className="space-y-6">

                    {/* List */}
                    <div className="bg-white rounded-2xl border shadow-sm overflow-visible">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold text-slate-800">Todos los registros</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {records.length} en total · {statusCounts.cerrados} cerrados
                            </p>
                            {/* Filtros por gravedad y estado */}
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-slate-500">Gravedad</label>
                                    <select
                                        value={historialFilterSeverity}
                                        onChange={e => setHistorialFilterSeverity(e.target.value)}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    >
                                        <option value="">Todos</option>
                                        {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-slate-500">Estado</label>
                                    <select
                                        value={historialFilterStatus}
                                        onChange={e => setHistorialFilterStatus(e.target.value)}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    >
                                        <option value="">Todos</option>
                                        <option value="seguimiento">En seguimiento</option>
                                        <option value="cerrado">Cerrada</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {(() => {
                            // Cerrado si resuelto o status cerrado; resto (incl. legacy abierto) → seguimiento
                            const effectiveStatus = (r: { status?: string | null; resolved?: boolean }) => {
                                const s = (r.status || "").toLowerCase()
                                if (s === "cerrado" || s === "cerrada" || r.resolved) return "cerrado"
                                return "seguimiento"
                            }
                            const filteredRecords = records.filter(r => {
                                const matchSeverity = !historialFilterSeverity || r.severity === historialFilterSeverity
                                const matchStatus = !historialFilterStatus || effectiveStatus(r) === historialFilterStatus
                                return matchSeverity && matchStatus
                            })
                            const hasFilters = !!historialFilterSeverity || !!historialFilterStatus
                            return filteredRecords.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">{hasFilters ? "Ningún registro coincide con los filtros" : "No hay registros aún"}</p>
                                    {hasFilters ? (
                                        <button onClick={() => { setHistorialFilterSeverity(""); setHistorialFilterStatus("") }} className="mt-3 text-xs text-indigo-600 hover:underline">
                                            Limpiar filtros
                                        </button>
                                    ) : (
                                        <button onClick={() => setTab("nuevo")} className="mt-3 text-xs text-indigo-600 hover:underline">
                                            Registrar el primer caso →
                                        </button>
                                    )}
                                </div>
                            ) : (
                            <>
                            <div className="p-4 space-y-2 bg-slate-50/50">
                                {filteredRecords.map(r => {
                                    const typeLabel = (r.type === "Otro" || r.type.startsWith("Otro:"))
                                        ? r.type
                                        : normalizeConvivenciaTypeForUi(
                                            RECORD_TYPES.find(t => t.value === r.type || t.label === r.type)?.label ?? r.type
                                        )
                                    const statusMeta = HISTORY_STATUS_LABELS[effectiveStatus(r)]
                                    const involvedList: any[] = (r.convivencia_record_students ?? [])
                                        .map((rs: any) => rs?.students)
                                        .filter(Boolean)
                                    const visibleStudents = involvedList.slice(0, 3)
                                    const extraStudents = Math.max(involvedList.length - visibleStudents.length, 0)
                                    const titleTrim = r.event_title?.trim() ?? ""
                                    return (
                                        <div
                                            key={r.id}
                                            className={`flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm transition-all hover:border-slate-300 ${statusMeta.cardBorder}`}
                                        >
                                            <div className="flex flex-1 flex-col gap-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                                <span className="text-xs font-medium text-slate-500 shrink-0">
                                                    {new Date(r.incident_date).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusMeta.class}`}>{statusMeta.label}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[r.severity] ?? "bg-slate-100 text-slate-600"}`}>{SEVERITY_LABELS[r.severity] ?? r.severity}</span>
                                                {r.location && <span className="text-xs text-slate-500 truncate max-w-[120px]" title={r.location}>📍 {r.location}</span>}
                                                {involvedList.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                                                        {visibleStudents.map((s: any) => {
                                                            const name = `${s?.last_name ?? ""}, ${s?.name ?? ""}`.trim().replace(/^,|,$/g, "").trim()
                                                            const getInitial = (val: unknown) => {
                                                                const str = (val ?? "").toString().trim()
                                                                if (!str) return ""
                                                                // Quita tildes para que se vea como en la foto (A-Z).
                                                                return str
                                                                    .charAt(0)
                                                                    .normalize("NFD")
                                                                    .replace(/[\u0300-\u036f]/g, "")
                                                                    .toUpperCase()
                                                            }
                                                            const initials = `${getInitial(s?.name)}${getInitial(s?.last_name)}`.replace(/[^A-Z]/g, "")
                                                            const courseData = s?.courses ?? s?.course ?? students.find((st: Student) => st.id === s?.id)?.courses
                                                            const courseLabel = courseData?.name
                                                                ? `${courseData.name}${courseData.section ? " " + courseData.section : ""}`
                                                                : "Sin curso"
                                                            return (
                                                                <span
                                                                    key={s?.id}
                                                                    className="group relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shrink-0 cursor-default hover:z-50"
                                                                    title={`${name} — ${courseLabel}`}
                                                                >
                                                                    {initials || "?"}
                                                                        <span className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0">
                                                                        <span className="block w-max max-w-[220px] rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg">
                                                                            <span className="block text-xs font-semibold text-white leading-tight">{name || "Estudiante"}</span>
                                                                            <span className="block text-[11px] text-white/80 mt-0.5 leading-snug">{courseLabel}</span>
                                                                        </span>
                                                                    </span>
                                                                </span>
                                                            )
                                                        })}
                                                        {extraStudents > 0 && (
                                                            <span className="group relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold shrink-0 cursor-default hover:z-50">
                                                                +{extraStudents}
                                                                <span className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0">
                                                                    <span className="block w-max max-w-[220px] rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg space-y-2">
                                                                        {involvedList.slice(3).map((s: any) => {
                                                                            const n = `${s?.last_name ?? ""}, ${s?.name ?? ""}`.trim().replace(/^,|,$/g, "").trim()
                                                                            const cData = s?.courses ?? s?.course ?? students.find((st: Student) => st.id === s?.id)?.courses
                                                                            const cLabel = cData?.name ? `${cData.name}${cData.section ? " " + cData.section : ""}` : "Sin curso"
                                                                            return (
                                                                                <span key={s?.id} className="block text-left">
                                                                                    <span className="block text-xs font-semibold text-white leading-tight">{n || "Estudiante"}</span>
                                                                                    <span className="block text-[10px] text-white/80 leading-snug">{cLabel}</span>
                                                                                </span>
                                                                            )
                                                                        })}
                                                                    </span>
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                </div>
                                                {titleTrim ? (
                                                    <p className="text-sm font-semibold text-slate-900 leading-snug truncate" title={titleTrim}>{titleTrim}</p>
                                                ) : null}
                                                <p className={`text-sm leading-snug truncate ${titleTrim ? "text-slate-600" : "font-semibold text-slate-800"}`} title={typeLabel}>{typeLabel}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setDetailRecordId(r.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors shrink-0"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Ver registro
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>

                        {/* Modal detalle del registro */}
                        <Dialog open={!!detailRecordId} onOpenChange={(open) => !open && setDetailRecordId(null)}>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-[2rem]">
                                <DialogHeader>
                                    <DialogTitle>Registro de convivencia</DialogTitle>
                                </DialogHeader>
                                {(() => {
                                    const r = detailRecordId ? records.find(rec => rec.id === detailRecordId) : null
                                    if (!r) return null
                                    const typeLabel = (r.type === "Otro" || r.type.startsWith("Otro:"))
                                        ? r.type
                                        : normalizeConvivenciaTypeForUi(
                                            RECORD_TYPES.find(t => t.value === r.type || t.label === r.type)?.label ?? r.type
                                        )
                                    const involvedList = (r.convivencia_record_students ?? []).map(rs => rs.students).filter(Boolean)
                                    const statusMeta = HISTORY_STATUS_LABELS[effectiveStatus(r)]
                                    return (
                                        <div className="space-y-4 text-sm">
                                            {r.event_title?.trim() && (
                                                <p className="text-base font-semibold text-slate-900">{r.event_title.trim()}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-slate-800">{typeLabel}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.class}`}>{statusMeta.label}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${SEVERITY_COLORS[r.severity] ?? "bg-slate-100 text-slate-600"}`}>{SEVERITY_LABELS[r.severity] ?? r.severity}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-slate-600">
                                                <p><span className="font-medium text-slate-500">Fecha y hora:</span> {new Date(r.incident_date).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                                {r.location && <p><span className="font-medium text-slate-500">Lugar:</span> {r.location}</p>}
                                                <p><span className="font-medium text-slate-500">Involucrados:</span> {r.involved_count}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-500 mb-1">Descripción</p>
                                                <p className="text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 border border-slate-100">{r.description}</p>
                                            </div>
                                            {involvedList.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-slate-500 mb-1.5">Estudiantes asociados</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {involvedList.map((s: any) => {
                                                            const courseData = s.courses ?? s.course ?? students.find((st: Student) => st.id === s.id)?.courses
                                                            const courseLabel = courseData ? ` — ${courseData.name}${courseData.section ? " " + courseData.section : ""}` : ""
                                                            return (
                                                                <span key={s.id} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium">
                                                                    {s.last_name}, {s.name}{courseLabel}
                                                                </span>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {r.actions_taken?.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-slate-500 mb-1.5">Acciones realizadas</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {r.actions_taken.map(a => (
                                                            <span key={a} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs">{a}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {r.agreements && (
                                                <div>
                                                    <p className="font-medium text-slate-500 mb-1">Acuerdos</p>
                                                    <p className="text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs">{r.agreements}</p>
                                                </div>
                                            )}
                                            <div className="pt-4 border-t border-slate-200 space-y-3">
                                                <HistoryCaseStatus record={r} />
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => handleDownloadPdf(r)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100">
                                                        <Download className="w-3.5 h-3.5" /> Descargar PDF
                                                    </button>
                                                    <button type="button" onClick={() => handlePrint(r)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                                                        <Printer className="w-3.5 h-3.5" /> Imprimir
                                                    </button>
                                                    <button type="button" onClick={() => { handleEdit(r); setDetailRecordId(null) }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                                                        <Edit className="w-3.5 h-3.5" /> Editar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </DialogContent>
                        </Dialog>
                            </>
                            );
                            })()}
                    </div>
                </div>
            )}
        </div>
    )
}
