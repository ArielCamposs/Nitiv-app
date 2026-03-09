"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import {
    FileText, FileSpreadsheet, Download, BarChart3,
    Thermometer, GitMerge, AlertTriangle, TrendingUp,
    TrendingDown, Users, Zap,
} from "lucide-react"
import {
    generateStudentPDF, generateClimatePDF, generateInstitutionalPDF,
} from "@/lib/reports/generate-pdf"
import {
    generateEmotionsExcel, generateIncidentsExcel, generateAlertsExcel,
} from "@/lib/reports/generate-excel"
import { cn } from "@/lib/utils"

// ─── Roles con acceso amplio ──────────────────────────────────────────────────
const STAFF_ROLES = ["admin", "dupla", "convivencia", "director", "inspector", "utp"]

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface StudentDetail {
    id: string
    name: string
    lastEmotion: string
    lastEmotionRaw: string | null
    alertCount: number
    incidentCount: number
    hasPaec: boolean
}

interface CourseClimate {
    courseId: string
    courseName: string
    label: string
    avgScore: number | null
    registros: number
    weeks: { semana: string; promedio: number | null; registros: number }[]
    studentsDetail: StudentDetail[]
}

interface StudentItem {
    id: string; name: string; last_name: string
    courseName: string; hasPaec: boolean
}

interface Props {
    role: string
    emotionRows: any[]
    incidentRows: any[]
    alertRows: any[]
    mesesData: any[]
    coursesClimate: CourseClimate[]
    institutionName: string
    totalStudents: number
    totalAlerts: number
    totalIncidents: number
    studentsList: StudentItem[]
    emotionsByStudent: any[]
    incidentsByStudent: any[]
    alertsByStudent: any[]
    studentsMap: Record<string, any>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const EMOTION_COLOR: Record<string, string> = {
    muy_bien: "text-emerald-600", bien: "text-emerald-500",
    neutral: "text-slate-500", mal: "text-rose-500", muy_mal: "text-rose-600",
}

const CLIMATE_COLOR: Record<string, string> = {
    "Regulada": "text-green-600 bg-green-50 border-green-200",
    "Inquieta": "text-yellow-700 bg-yellow-50 border-yellow-200",
    "Apática": "text-blue-600 bg-blue-50 border-blue-200",
    "Explosiva": "text-red-600 bg-red-50 border-red-200",
    "Sin datos": "text-slate-400 bg-slate-50 border-slate-200",
}

const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })

// ─── ReportCard ──────────────────────────────────────────────────────────────
function ReportCard({ title, description, icon: Icon, onPDF, onExcel, loadingPDF, loadingExcel }: {
    title: string; description: string; icon: React.ElementType
    onPDF?: () => void; onExcel?: () => void
    loadingPDF?: boolean; loadingExcel?: boolean
}) {
    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                        <Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex gap-2 pt-0">
                {onPDF && (
                    <Button variant="outline" size="sm" onClick={onPDF} disabled={loadingPDF} className="gap-1.5">
                        <FileText className="w-4 h-4" />
                        {loadingPDF ? "Generando..." : "Exportar PDF"}
                    </Button>
                )}
                {onExcel && (
                    <Button variant="outline" size="sm" onClick={onExcel} disabled={loadingExcel} className="gap-1.5">
                        <FileSpreadsheet className="w-4 h-4" />
                        {loadingExcel ? "Generando..." : "Exportar Excel"}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function KPISection({ coursesClimate }: {
    coursesClimate: CourseClimate[]
}) {
    const withData = coursesClimate.filter(c => c.avgScore !== null)
    const critical = [...withData].sort((a, b) => (a.avgScore ?? 4) - (b.avgScore ?? 4))[0]
    const best = [...withData].sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0]

    const allStudents = coursesClimate.flatMap(c => c.studentsDetail)
    const lowStudentsCount = allStudents.filter(s => s.lastEmotionRaw === "mal" || s.lastEmotionRaw === "muy_mal").length
    const topStudentsCount = allStudents.filter(s => s.lastEmotionRaw === "muy_bien" || s.lastEmotionRaw === "bien").length

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", CLIMATE_COLOR[critical?.label ?? "Sin datos"])}>
                            {critical?.label ?? "Sin datos"}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Curso más crítico</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{critical?.courseName ?? "—"}</p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-green-50">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", CLIMATE_COLOR[best?.label ?? "Sin datos"])}>
                            {best?.label ?? "Sin datos"}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Mejor clima</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{best?.courseName ?? "—"}</p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-rose-50">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                            Atención
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Marcando bajo</p>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">{lowStudentsCount}</p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-emerald-50">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                            Bienestar
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Mejor registro</p>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">{topStudentsCount}</p>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Accordion por curso ──────────────────────────────────────────────────────
function CourseAccordion({ coursesClimate }: { coursesClimate: CourseClimate[] }) {
    if (coursesClimate.length === 0) {
        return <p className="text-sm text-slate-400">No hay cursos con datos.</p>
    }

    return (
        <Accordion type="multiple" className="space-y-2">
            {coursesClimate.map(course => {
                const alertStudents = course.studentsDetail.filter(s => s.alertCount > 0 || s.incidentCount > 0)
                return (
                    <AccordionItem
                        key={course.courseId}
                        value={course.courseId}
                        className="rounded-xl border bg-white shadow-sm px-4"
                    >
                        <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center justify-between w-full pr-2 text-left">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <span className="text-sm font-bold text-slate-800">{course.courseName}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", CLIMATE_COLOR[course.label])}>
                                            {course.label}
                                        </span>
                                        {alertStudents.length > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                                <AlertTriangle className="w-3 h-3" />
                                                {alertStudents.length} críticos
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-4">
                            {/* Tendencia semanal del curso */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                {course.weeks.map((w, idx) => (
                                    <div key={idx} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase">{w.semana}</p>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-xs font-bold text-slate-700">
                                                {w.promedio !== null ? `${w.promedio}` : "—"}
                                            </span>
                                            <span className="text-[9px] text-slate-400">
                                                {w.registros} reg.
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Listado de estudiantes */}
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estado de estudiantes</h4>
                                {course.studentsDetail.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Sin estudiantes registrados.</p>
                                ) : (
                                    <div className="grid gap-1">
                                        {course.studentsDetail.map(student => (
                                            <div
                                                key={student.id}
                                                className={cn(
                                                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                                                    (student.alertCount > 0 || student.incidentCount > 0)
                                                        ? "bg-rose-50 border border-rose-100"
                                                        : "bg-slate-50 border border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-800">{student.name}</span>
                                                    {student.hasPaec && (
                                                        <span className="text-[10px] bg-indigo-100 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold">PAEC</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={cn("text-xs font-bold", EMOTION_COLOR[student.lastEmotionRaw ?? ""] ?? "text-slate-400")}>
                                                        {student.lastEmotion}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        {student.alertCount > 0 && (
                                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                                                {student.alertCount}A
                                                            </span>
                                                        )}
                                                        {student.incidentCount > 0 && (
                                                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                                                {student.incidentCount} DEC
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    )
}

function HighImpactLists({ coursesClimate }: { coursesClimate: CourseClimate[] }) {
    const allStudents = coursesClimate.flatMap(c =>
        c.studentsDetail.map(s => ({ ...s, courseName: c.courseName }))
    )

    const lowStudents = allStudents
        .filter(s => s.lastEmotionRaw === "mal" || s.lastEmotionRaw === "muy_mal")
        .slice(0, 5)

    const topStudents = allStudents
        .filter(s => s.lastEmotionRaw === "muy_bien")
        .slice(0, 5)

    if (lowStudents.length === 0 && topStudents.length === 0) return null

    return (
        <div className="grid md:grid-cols-2 gap-4">
            {lowStudents.length > 0 && (
                <Card className="border-0 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="py-3 bg-rose-50/50 border-b border-rose-100">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-rose-700 flex items-center gap-2">
                            <TrendingDown className="w-3.5 h-3.5" />
                            Marcando bajo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {lowStudents.map(s => (
                                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                                        <p className="text-[10px] text-slate-400">{s.courseName}</p>
                                    </div>
                                    <span className={cn("text-xs font-bold", EMOTION_COLOR[s.lastEmotionRaw ?? ""])}>
                                        {s.lastEmotion}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {topStudents.length > 0 && (
                <Card className="border-0 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="py-3 bg-emerald-50/50 border-b border-emerald-100">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" />
                            Mejor registro
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {topStudents.map(s => (
                                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                                        <p className="text-[10px] text-slate-400">{s.courseName}</p>
                                    </div>
                                    <span className={cn("text-xs font-bold", EMOTION_COLOR[s.lastEmotionRaw ?? ""])}>
                                        {s.lastEmotion}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ReportesClient({
    role, emotionRows, incidentRows, alertRows,
    mesesData, coursesClimate, institutionName,
    totalStudents, totalAlerts, totalIncidents,
    studentsList, emotionsByStudent, incidentsByStudent, alertsByStudent,
}: Props) {
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [selectedStudent, setSelectedStudent] = useState<string>("")
    const [selectedCourse, setSelectedCourse] = useState<string>("")

    const isStaff = STAFF_ROLES.includes(role)

    const withLoading = async (key: string, fn: () => void) => {
        setLoading(p => ({ ...p, [key]: true }))
        await new Promise(r => setTimeout(r, 100))
        try { fn() } finally { setLoading(p => ({ ...p, [key]: false })) }
    }

    const handleStudentPDF = () => {
        if (!selectedStudent) return
        const st = studentsList.find(s => s.id === selectedStudent)
        if (!st) return
        const emotions2 = emotionsByStudent.filter(e => e.student_id === st.id)
        const incidents2 = incidentsByStudent.filter(i => i.student_id === st.id)
        const alerts2 = alertsByStudent.filter(a => a.student_id === st.id)
        generateStudentPDF({
            student: { name: st.name, last_name: st.last_name, courseName: st.courseName },
            emotions: emotions2.map(e => ({
                date: e.created_at,
                emotion: e.emotion,
                intensity: e.intensity,
                stress: e.stress_level ?? null,
                anxiety: e.anxiety_level ?? null,
                reflection: e.reflection,
            })),
            incidents: incidents2.map(i => ({
                folio: i.folio,
                type: i.type,
                severity: i.severity,
                date: i.incident_date,
                resolved: i.resolved,
            })),
            hasPaec: st.hasPaec,
            alerts: alerts2.map(a => ({
                type: a.type,
                description: a.description,
                date: a.created_at,
                resolved: a.resolved,
            })),
        })
    }

    return (
        <div className="space-y-6">

            {isStaff && (
                <KPISection
                    coursesClimate={coursesClimate}
                />
            )}

            {(role === "dupla" || role === "convivencia") ? (
                <div className="space-y-8 pb-10">
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Estadísticas principales
                        </h2>
                        <HighImpactLists coursesClimate={coursesClimate} />
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Detalle por curso y clima de aula
                        </h2>
                        <CourseAccordion coursesClimate={coursesClimate} />
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Fichas individuales</h2>
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                        <FileText className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Ficha individual del estudiante</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">PDF con historial emocional, DEC, PAEC y alertas</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row gap-3 pt-0">
                                <select
                                    value={selectedStudent}
                                    onChange={e => setSelectedStudent(e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                >
                                    <option value="">Selecciona un estudiante</option>
                                    {studentsList.map((s, i) => (
                                        <option key={s.id ?? `student-${i}`} value={s.id ?? ""}>
                                            {s.name} {s.last_name} — {s.courseName}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => withLoading("student", handleStudentPDF)}
                                    disabled={!selectedStudent || loading["student"]}
                                    className="gap-1.5 shrink-0"
                                >
                                    <Download className="w-4 h-4" />
                                    {loading["student"] ? "Generando..." : "Exportar PDF"}
                                </Button>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Otras herramientas</h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            <ReportCard
                                title="Registros emocionales"
                                description="Check-ins diarios del período (Excel)"
                                icon={FileSpreadsheet}
                                onExcel={() => withLoading("emotionsXlsx", () =>
                                    generateEmotionsExcel({ courseName: institutionName, rows: emotionRows })
                                )}
                                loadingExcel={loading["emotionsXlsx"]}
                            />
                            <ReportCard
                                title="Casos DEC"
                                description="Listado completo de incidencias (Excel)"
                                icon={FileSpreadsheet}
                                onExcel={() => withLoading("incidentsXlsx", () =>
                                    generateIncidentsExcel({ rows: incidentRows })
                                )}
                                loadingExcel={loading["incidentsXlsx"]}
                            />
                        </div>
                    </section>
                </div>
            ) : (
                <Tabs defaultValue="bienestar" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 h-auto p-1">
                        <TabsTrigger value="bienestar" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
                            <BarChart3 className="w-4 h-4 shrink-0" />
                            <span>Bienestar</span>
                        </TabsTrigger>
                        <TabsTrigger value="clima" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
                            <Thermometer className="w-4 h-4 shrink-0" />
                            <span>Clima</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab 1: Bienestar ─────────────────────────────────────────── */}
                    <TabsContent value="bienestar" className="space-y-6">
                        {isStaff && (
                            <section className="space-y-3">
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Detalle por curso</h2>
                                <CourseAccordion coursesClimate={coursesClimate} />
                            </section>
                        )}

                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Fichas individuales</h2>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                            <FileText className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Ficha individual del estudiante</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">PDF con historial emocional, DEC, PAEC y alertas</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col sm:flex-row gap-3 pt-0">
                                    <select
                                        value={selectedStudent}
                                        onChange={e => setSelectedStudent(e.target.value)}
                                        className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    >
                                        <option value="">Selecciona un estudiante</option>
                                        {studentsList.map((s, i) => (
                                            <option key={s.id ?? `student-${i}`} value={s.id ?? ""}>
                                                {s.name} {s.last_name} — {s.courseName}
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => withLoading("student", handleStudentPDF)}
                                        disabled={!selectedStudent || loading["student"]}
                                        className="gap-1.5 shrink-0"
                                    >
                                        <Download className="w-4 h-4" />
                                        {loading["student"] ? "Generando..." : "Exportar PDF"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Datos en Excel</h2>
                            <div className="grid gap-3 md:grid-cols-2">
                                <ReportCard
                                    title="Registros emocionales"
                                    description="Todos los check-ins diarios del período"
                                    icon={FileSpreadsheet}
                                    onExcel={() => withLoading("emotionsXlsx", () =>
                                        generateEmotionsExcel({ courseName: institutionName, rows: emotionRows })
                                    )}
                                    loadingExcel={loading["emotionsXlsx"]}
                                />
                                <ReportCard
                                    title="Alertas de estudiantes"
                                    description="Todas las alertas generadas con estado actual"
                                    icon={FileSpreadsheet}
                                    onExcel={() => withLoading("alertsXlsx", () =>
                                        generateAlertsExcel({ rows: alertRows })
                                    )}
                                    loadingExcel={loading["alertsXlsx"]}
                                />
                            </div>
                        </section>
                    </TabsContent>

                    {/* ── Tab 2: Clima ─────────────────────────────────────────────── */}
                    <TabsContent value="clima" className="space-y-6">
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Exportar</h2>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                            <FileText className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Clima emocional por curso</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">Tendencias de energía del aula, últimas 4 semanas</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col sm:flex-row gap-3 pt-0">
                                    <select
                                        value={selectedCourse}
                                        onChange={e => setSelectedCourse(e.target.value)}
                                        className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    >
                                        <option value="">Selecciona un curso</option>
                                        {coursesClimate.map((c, i) => (
                                            <option key={c.courseId ?? `curso-${i}`} value={c.courseId ?? ""}>
                                                {c.courseName}
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => {
                                            if (!selectedCourse) return
                                            const course = coursesClimate.find(c => c.courseId === selectedCourse)
                                            if (!course) return
                                            withLoading("climate", () =>
                                                generateClimatePDF({
                                                    courseName: course.courseName,
                                                    weeks: course.weeks,
                                                    students: course.studentsDetail.map(s => ({
                                                        name: s.name,
                                                        hasPaec: s.hasPaec,
                                                        alertCount: s.alertCount,
                                                        incidentCount: s.incidentCount,
                                                        lastEmotion: s.lastEmotion,
                                                    })),
                                                })
                                            )
                                        }}
                                        disabled={!selectedCourse || loading["climate"]}
                                        className="gap-1.5 shrink-0"
                                    >
                                        <FileText className="w-4 h-4" />
                                        {loading["climate"] ? "Generando..." : "Exportar PDF"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>

                    {/* Exportaciones adicionales (antes en Match de datos) */}
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Exportar</h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            <ReportCard
                                title="Casos DEC"
                                description="Listado completo de DEC con estado y severidad"
                                icon={FileSpreadsheet}
                                onExcel={() => withLoading("incidentsXlsx", () =>
                                    generateIncidentsExcel({ rows: incidentRows })
                                )}
                                loadingExcel={loading["incidentsXlsx"]}
                            />
                            {role === "director" && (
                                <ReportCard
                                    title="Reporte institucional"
                                    description="Resumen general: estudiantes, alertas, DEC y tendencias mensuales"
                                    icon={FileText}
                                    onPDF={() => withLoading("institutional", () =>
                                        generateInstitutionalPDF({
                                            institutionName,
                                            totalStudents,
                                            totalAlerts,
                                            totalIncidents,
                                            meses: mesesData,
                                            courses: coursesClimate,
                                            alertsByType: (() => {
                                                const map: Record<string, { total: number; open: number }> = {}
                                                alertRows.forEach(a => {
                                                    if (!map[a.alertType]) {
                                                        map[a.alertType] = { total: 0, open: 0 }
                                                    }
                                                    map[a.alertType].total += 1
                                                    if (!a.resolved) map[a.alertType].open += 1
                                                })
                                                return Object.entries(map).map(([type, v]) => ({
                                                    type,
                                                    total: v.total,
                                                    open: v.open,
                                                }))
                                            })(),
                                            decBySeverity: (() => {
                                                const map: Record<string, { total: number; open: number }> = {}
                                                incidentRows.forEach(i => {
                                                    if (!map[i.severity]) {
                                                        map[i.severity] = { total: 0, open: 0 }
                                                    }
                                                    map[i.severity].total += 1
                                                    if (!i.resolved) map[i.severity].open += 1
                                                })
                                                return Object.entries(map).map(([severity, v]) => ({
                                                    severity,
                                                    total: v.total,
                                                    open: v.open,
                                                }))
                                            })(),
                                            topRiskCourses: (() => {
                                                const map: Record<string, { alerts: number; incidents: number }> = {}
                                                alertRows.forEach(a => {
                                                    const key = a.courseName
                                                    if (!map[key]) map[key] = { alerts: 0, incidents: 0 }
                                                    if (!a.resolved) map[key].alerts += 1
                                                })
                                                incidentRows.forEach(i => {
                                                const key = i.courseName
                                                    if (!map[key]) map[key] = { alerts: 0, incidents: 0 }
                                                    if (!i.resolved) map[key].incidents += 1
                                                })
                                                return coursesClimate
                                                    .map(c => ({
                                                        courseName: c.courseName,
                                                        label: c.label,
                                                        alerts: map[c.courseName]?.alerts ?? 0,
                                                        incidents: map[c.courseName]?.incidents ?? 0,
                                                    }))
                                                    .filter(c => c.alerts + c.incidents > 0)
                                                    .sort((a, b) => (b.alerts + b.incidents) - (a.alerts + a.incidents))
                                                    .slice(0, 5)
                                            })(),
                                        })
                                    )}
                                    loadingPDF={loading["institutional"]}
                                />
                            )}
                        </div>
                    </section>
                </Tabs>
            )}
        </div>
    )
}
