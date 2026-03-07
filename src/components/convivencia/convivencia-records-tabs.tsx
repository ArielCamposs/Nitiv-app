"use client"

import { useState, useTransition, useMemo } from "react"
import { createConvivenciaRecord, updateConvivenciaRecord, resolveConvivenciaRecord } from "@/app/(dashboard)/registros-convivencia/actions"
import { buildConvivenciaPdf } from "@/lib/pdf/convivencia-pdf"
import { toast } from "sonner"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from "recharts"
import { ClipboardList, Plus, History, TrendingUp, TrendingDown, Minus, CheckCircle, ChevronDown, ChevronUp, Search, X, Mic, MicOff, BarChart3, Printer, Download, Edit, AlertCircle, Trophy, CalendarDays, Activity } from "lucide-react"

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

const SEVERITIES = [
    { value: "leve", label: "Leve", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    { value: "moderada", label: "Moderada", color: "bg-orange-100 text-orange-700 border-orange-300" },
    { value: "grave", label: "Grave", color: "bg-red-100 text-red-700 border-red-300" },
]

const ACTIONS_OPTIONS = [
    "Entrevista con estudiante(s)",
    "Contención emocional",
    "Mediación / Resolución de conflictos",
    "Comunicación a apoderados (llamada/correo)",
    "Derivación externa",
    "Aplicación de medida disciplinaria",
]

const SEVERITY_COLORS: { [key: string]: string } = {
    leve: "bg-yellow-100 text-yellow-700",
    moderada: "bg-orange-100 text-orange-700",
    grave: "bg-red-100 text-red-700",
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Student {
    id: string
    name: string
    last_name: string
    rut?: string | null
    courses?: { name: string } | null
}

interface StaffUser {
    id: string
    name: string
    last_name: string
    role: string
}

interface InvolvedStudent {
    student_id: string
    students: { id: string; name: string; last_name: string } | null
}

interface ConvivenciaRecord {
    id: string
    status: string
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
}

interface Props {
    initialRecords: ConvivenciaRecord[]
    students: Student[]
    staffUsers: StaffUser[]
    reporterName: string
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

// ── Resolve Row ────────────────────────────────────────────────────────────────
function ResolveRow({ record, onResolved }: {
    record: ConvivenciaRecord
    onResolved: (id: string, notes: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [notes, setNotes] = useState(record.resolution_notes ?? "")
    const [pending, startTransition] = useTransition()

    if (record.resolved) {
        return (
            <div className="mt-2 pl-2 border-l-2 border-emerald-300">
                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Resuelto
                </p>
                {record.resolution_notes && (
                    <p className="text-xs text-slate-500 mt-0.5">{record.resolution_notes}</p>
                )}
            </div>
        )
    }

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
            >
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {open ? "Cerrar" : "Registrar resolución / medidas tomadas"}
            </button>

            {open && (
                <div className="mt-2 space-y-2">
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Describe cómo se resolvió el caso, qué medidas se tomaron, acuerdos, sanciones, etc."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                            startTransition(async () => {
                                const result = await resolveConvivenciaRecord(record.id, notes.trim())
                                if (result?.error) {
                                    toast.error(result.error)
                                } else {
                                    toast.success("Caso marcado como resuelto")
                                    onResolved(record.id, notes.trim())
                                    setOpen(false)
                                }
                            })
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {pending ? "Guardando..." : "Marcar como resuelto"}
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ConvivenciaRecordsTabs({ initialRecords, students, staffUsers, reporterName }: Props) {
    const [tab, setTab] = useState<"nuevo" | "historial" | "estadisticas">("nuevo")
    const [records, setRecords] = useState<ConvivenciaRecord[]>(initialRecords)
    const [pending, startTransition] = useTransition()
    const [createdRecord, setCreatedRecord] = useState<ConvivenciaRecord | null>(null)
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

    // Form state
    const [status, setStatus] = useState("abierto")
    const [responsableId, setResponsableId] = useState("")
    const [apoyoId, setApoyoId] = useState("")

    const [type, setType] = useState("")
    const [severity, setSeverity] = useState("moderada")
    const [location, setLocation] = useState("")
    const [description, setDescription] = useState("")
    const [agreements, setAgreements] = useState("")

    // Voice Dictation State
    const [isListening, setIsListening] = useState(false)
    const [listeningField, setListeningField] = useState<"description" | "agreements" | null>(null)

    const [selectedCourse, setSelectedCourse] = useState("")
    const [involvedStudents, setInvolvedStudents] = useState<Student[]>([])
    const [actions, setActions] = useState<string[]>([])
    const [otherAction, setOtherAction] = useState("")
    const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16))

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
        const counts: { [id: string]: { name: string, last_name: string, count: number } } = {}
        for (const r of records) {
            for (const inv of r.convivencia_record_students || []) {
                const s = inv.students
                if (!s) continue
                if (!counts[s.id]) counts[s.id] = { name: s.name, last_name: s.last_name, count: 0 }
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

    const resolutionRate = useMemo(() => {
        if (records.length === 0) return 0
        const resolved = records.filter(r => r.resolved).length
        return Math.round((resolved / records.length) * 100)
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
            { label: "Moderada", count: counts.moderada, color: "bg-purple-100", textColor: "text-purple-700" },
            { label: "Grave", count: counts.grave, color: "bg-rose-100", textColor: "text-rose-700" },
            { label: "Gravísimo", count: counts.gravisimo, color: "bg-red-200", textColor: "text-red-700" },
        ]
    }, [records])

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

    function handleResolved(id: string, notes: string) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, resolved: true, resolution_notes: notes } : r))
    }

    function handlePrint(record: ConvivenciaRecord) {
        const doc = buildConvivenciaPdf(record, reporterName)
        doc.autoPrint()
        doc.output('dataurlnewwindow')
    }

    function handleDownloadPdf(record: ConvivenciaRecord) {
        const doc = buildConvivenciaPdf(record, reporterName)
        doc.save(`registro-convivencia-${record.type || 'caso'}.pdf`)
    }

    function handleEdit(record: ConvivenciaRecord) {
        setEditingRecordId(record.id)
        setStatus(record.status || "abierto")
        setResponsableId(record.responsable_id || "")
        setApoyoId(record.apoyo_id || "")
        setType(record.type || "")
        setSeverity(record.severity || "moderada")
        setLocation(record.location || "")
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
            setIncidentDate(local.toISOString().slice(0, 16))
        }

        setTab("nuevo")
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!type) { toast.error("Selecciona el tipo de caso"); return }
        if (!description.trim()) { toast.error("La descripción es obligatoria"); return }

        const allActions = [...actions, ...(otherAction.trim() ? [otherAction.trim()] : [])]
        const parsedDate = new Date(incidentDate).toISOString()

        startTransition(async () => {
            const payload = {
                status,
                responsable_id: responsableId || null,
                apoyo_id: apoyoId || null,
                agreements: agreements.trim(),
                type,
                severity,
                location: location.trim(),
                description: description.trim(),
                involved_count: Math.max(involvedStudents.length, 1),
                student_ids: involvedStudents.map(s => s.id),
                actions_taken: allActions,
                incident_date: parsedDate,
            }

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

                // Optimistic update
                const newRecord: ConvivenciaRecord = {
                    id: editingRecordId || (result as any).id || crypto.randomUUID(),
                    type,
                    severity,
                    location: location.trim() || null,
                    description: description.trim(),
                    involved_count: Math.max(involvedStudents.length, 1),
                    actions_taken: allActions,
                    resolved: editingRecordId ? records.find(r => r.id === editingRecordId)?.resolved ?? false : false,
                    resolution_notes: editingRecordId ? records.find(r => r.id === editingRecordId)?.resolution_notes ?? null : null,
                    incident_date: parsedDate,
                    convivencia_record_students: involvedStudents.map(s => ({
                        student_id: s.id,
                        students: { id: s.id, name: s.name, last_name: s.last_name },
                    })),
                } as any // using as any to ignore strict DB typing matching for optimistic updates

                if (editingRecordId) {
                    setRecords(prev => prev.map(r => r.id === editingRecordId ? { ...r, ...newRecord } : r))
                    setTab("historial")
                    setEditingRecordId(null)
                    // Reset
                    setStatus("abierto"); setResponsableId(""); setApoyoId("")
                    setType(""); setSeverity("moderada"); setLocation("")
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
                    <div className="pt-2 border-t mt-6 border-slate-100">
                        <button type="button" onClick={() => {
                            setCreatedRecord(null)
                            // Reset state
                            setStatus("abierto"); setResponsableId(""); setApoyoId("")
                            setType(""); setSeverity("moderada"); setLocation("")
                            setDescription(""); setAgreements(""); setInvolvedStudents([])
                            setSelectedCourse(""); setActions([]); setOtherAction("")
                            setIncidentDate(new Date().toISOString().slice(0, 16))
                            setTab("historial")
                        }} className="text-indigo-600 font-semibold hover:underline text-sm">
                            Volver al historial
                        </button>
                    </div>
                </div>
            )}
            {tab === "nuevo" && !createdRecord && (
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl border shadow-sm p-8 space-y-10">

                    {/* Header: Estado y Fecha */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-slate-700">Estado del caso</span>
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border">
                                {[
                                    { value: "abierto", label: "Abierto", color: "bg-emerald-400 text-white hover:bg-emerald-500", activeColor: "bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200" },
                                    { value: "seguimiento", label: "En seguimiento", color: "bg-orange-300 text-white hover:bg-orange-400", activeColor: "bg-orange-400 text-white shadow-md ring-2 ring-orange-200" },
                                    { value: "cerrado", label: "Cerrado", color: "bg-red-400 text-white hover:bg-red-500", activeColor: "bg-red-500 text-white shadow-md ring-2 ring-red-200" },
                                ].map(s => (
                                    <button
                                        type="button"
                                        key={s.value}
                                        onClick={() => setStatus(s.value)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${status === s.value
                                            ? s.activeColor
                                            : `${s.color} opacity-40 grayscale hover:opacity-70 hover:grayscale-0`
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-700">Fecha y hora</span>
                            <input type="datetime-local" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
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
                                    {staffUsers.map(u => <option key={u.id} value={u.id}>{u.last_name}, {u.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Apoyo</label>
                                <select value={apoyoId} onChange={e => setApoyoId(e.target.value)}
                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                    <option value="">Ninguno</option>
                                    {staffUsers.map(u => <option key={u.id} value={u.id}>{u.last_name}, {u.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Lugar del evento */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Lugar del evento</h3>
                            <div className="flex flex-wrap gap-2">
                                {["Patio", "Aula", "Baño", "Comedor", "Redes sociales", "Fuera del colegio"].map(loc => (
                                    <button key={loc} type="button"
                                        onClick={() => setLocation(prev => prev === loc ? "" : loc)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${location === loc
                                            ? "bg-indigo-500 text-white shadow-sm ring-2 ring-indigo-200"
                                            : location !== ""
                                                ? "bg-slate-100 text-slate-400 border border-slate-200 opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                                : "bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100"
                                            }`}
                                    >{loc}</button>
                                ))}
                            </div>
                        </div>

                        {/* Gravedad */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Gravedad</h3>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: "leve", label: "Leve", baseClass: "bg-indigo-100 text-indigo-700 border-indigo-200", activeClass: "bg-indigo-500 text-white shadow-md ring-2 ring-indigo-200" },
                                    { value: "moderada", label: "Mediano", baseClass: "bg-purple-100 text-purple-700 border-purple-200", activeClass: "bg-purple-500 text-white shadow-md ring-2 ring-purple-200" },
                                    { value: "grave", label: "Grave", baseClass: "bg-rose-100 text-rose-700 border-rose-200", activeClass: "bg-rose-500 text-white shadow-md ring-2 ring-rose-200" },
                                    { value: "gravisimo", label: "Gravísimo", baseClass: "bg-red-100 text-red-700 border-red-200", activeClass: "bg-red-600 text-white shadow-md ring-2 ring-red-200" },
                                ].map(s => (
                                    <button type="button" key={s.value} onClick={() => setSeverity(s.value)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${severity === s.value
                                            ? s.activeClass
                                            : `${s.baseClass} opacity-40 grayscale hover:opacity-70 hover:grayscale-0`
                                            } ${type === "Entrevista apoderado" ? "opacity-40 grayscale pointer-events-none" : ""}`}
                                    >{s.label}</button>
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
                                                    : selectedCourse !== ""
                                                        ? "bg-slate-100 text-slate-400 border-slate-200 opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                                        : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
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

                    {/* ── Tipo de evento ── */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Tipo de evento</h3>
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                            <select value={type} onChange={e => { setType(e.target.value); if (e.target.value === "Entrevista apoderado") setSeverity("n/a") }}
                                className="w-full sm:w-64 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                <option value="">Seleccione tipo...</option>
                                {RECORD_TYPES.map(t => <option key={t.value} value={t.label}>{t.label}</option>)}
                                <option value="Apoyo emocional">Apoyo emocional</option>
                                <option value="Entrevista apoderado">Entrevista apoderado</option>
                                <option value="Incumplimiento de normas">Incumplimiento de normas</option>
                            </select>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-slate-400">Frecuentes:</span>
                                {[
                                    { label: "Apoyo emocional", color: "border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100" },
                                    { label: "Entrevista apoderado", color: "border-red-400 text-red-700 bg-red-50 hover:bg-red-100" },
                                    { label: "Incumplimiento de normas", color: "border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100" },
                                ].map(shortcut => (
                                    <button key={shortcut.label} type="button"
                                        onClick={() => { setType(shortcut.label); if (shortcut.label === "Entrevista apoderado") setSeverity("n/a") }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${type === shortcut.label
                                            ? `${shortcut.color} ring-2 ring-offset-1 ring-slate-300 font-bold`
                                            : ["Apoyo emocional", "Entrevista apoderado", "Incumplimiento de normas"].includes(type)
                                                ? "bg-slate-100 text-slate-400 border-slate-200 opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                                : shortcut.color
                                            }`}
                                    >{shortcut.label}</button>
                                ))}
                            </div>
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
                                    className="w-full rounded-xl bg-white border border-slate-200 p-3 pb-12 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shadow-sm"
                                />
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
                                    className="w-full rounded-xl bg-white border border-slate-200 p-3 pb-12 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shadow-sm"
                                />
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

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        <button type="submit" disabled={pending}
                            className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {pending ? "Guardando..." : editingRecordId ? "Guardar Cambios" : "Registrar Caso"}
                        </button>
                        {editingRecordId && (
                            <button type="button" disabled={pending} onClick={() => {
                                setEditingRecordId(null)
                                setStatus("abierto"); setResponsableId(""); setApoyoId("")
                                setType(""); setSeverity("moderada"); setLocation("")
                                setDescription(""); setAgreements(""); setInvolvedStudents([])
                                setSelectedCourse(""); setActions([]); setOtherAction("")
                                setIncidentDate(new Date().toISOString().slice(0, 16))
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
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Últimos 30 días</p>
                            <p className="text-3xl font-bold text-slate-800 mt-1">{last30.length}</p>
                            <p className="text-xs text-slate-400 mt-1">casos registrados</p>
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

                        {/* 1. Tasa de Resolución */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col items-center justify-center text-center">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">Tasa de Resolución</h3>
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
                                        strokeDasharray={`${resolutionRate}, 100`}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-slate-800">{resolutionRate}%</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-4">
                                {records.filter(r => r.resolved).length} de {records.length} casos resueltos
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
                                        <div key={st.name + st.last_name + i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
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
                                        </div>
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
                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold text-slate-800">Todos los registros</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {records.length} en total · {records.filter(r => r.resolved).length} resueltos
                            </p>
                        </div>

                        {records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No hay registros aún</p>
                                <button onClick={() => setTab("nuevo")} className="mt-3 text-xs text-indigo-600 hover:underline">
                                    Registrar el primer caso →
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 space-y-4 bg-slate-50/50">
                                {records.map(r => {
                                    const rtype = RECORD_TYPES.find(t => t.value === r.type)
                                    const involvedList = (r.convivencia_record_students ?? [])
                                        .map(rs => rs.students)
                                        .filter(Boolean)

                                    return (
                                        <div key={r.id} className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:border-slate-300 ${r.resolved ? "opacity-75 grayscale-[30%]" : "border-l-4 border-l-indigo-500"}`}>
                                            <div className="flex flex-col md:flex-row items-start justify-between gap-4">

                                                {/* Left Column: Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        <span className="font-bold text-slate-800 text-sm">{rtype?.label ?? r.type}</span>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${SEVERITY_COLORS[r.severity] ?? "bg-slate-100 text-slate-600"}`}>
                                                            {r.severity.toUpperCase()}
                                                        </span>
                                                        {r.resolved && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 border border-emerald-200">
                                                                <CheckCircle className="w-3 h-3" /> Resuelto
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">{r.description}</p>

                                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                        {r.location && <span className="flex items-center gap-1.5"><span className="text-base">📍</span> {r.location}</span>}
                                                        <span className="flex items-center gap-1.5"><span className="text-base">👥</span> {r.involved_count} involucrado{r.involved_count !== 1 && "s"}</span>
                                                    </div>

                                                    {/* Involved students */}
                                                    {involvedList.length > 0 && (
                                                        <div className="mt-3">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">Estudiantes Asociados</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {involvedList.map((s: any) => (
                                                                    <span key={s.id} className="px-2.5 py-1 rounded-lg bg-indigo-50/50 text-indigo-700 border border-indigo-100 text-xs font-medium">
                                                                        {s.last_name}, {s.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Meta & Actions */}
                                                <div className="flex flex-col items-end shrink-0 md:w-48">
                                                    <div className="text-right bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 w-full mb-3">
                                                        <p className="text-xs font-bold text-slate-700">
                                                            {new Date(r.incident_date).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                                                        </p>
                                                        <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center justify-end gap-1">
                                                            <History className="w-3 h-3" />
                                                            {new Date(r.incident_date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} hrs
                                                        </p>
                                                    </div>

                                                    {r.actions_taken?.length > 0 && (
                                                        <div className="w-full flex flex-wrap justify-end gap-1.5 mb-4">
                                                            {r.actions_taken.map(a => (
                                                                <span key={a} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] uppercase font-bold tracking-wide">{a}</span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="w-full mt-auto space-y-2">
                                                        <div className="flex justify-end gap-2">
                                                            <button type="button" onClick={() => handleDownloadPdf(r)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 text-xs font-bold transition-colors">
                                                                <Download className="w-3.5 h-3.5" /> PDF
                                                            </button>
                                                            <button type="button" onClick={() => handlePrint(r)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 text-xs font-bold transition-colors">
                                                                <Printer className="w-3.5 h-3.5" /> Imprimir
                                                            </button>
                                                        </div>
                                                        <button type="button" onClick={() => handleEdit(r)}
                                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold transition-colors shadow-sm">
                                                            <Edit className="w-3.5 h-3.5" /> Editar Registro
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <ResolveRow record={r} onResolved={handleResolved} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
