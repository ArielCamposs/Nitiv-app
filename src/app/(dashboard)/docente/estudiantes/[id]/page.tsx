import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BackButton } from "@/components/ui/back-button"
import { PerceptionForm } from "@/components/teacher/perception-form"
import { StudentEmotionChart } from "@/components/student/student-emotion-chart"
import Link from "next/link"

const EMOTION_MAP: Record<string, { label: string; color: string }> = {
    muy_bien: { label: "😄 Muy bien", color: "text-emerald-600" },
    bien: { label: "🙂 Bien", color: "text-emerald-500" },
    neutral: { label: "😐 Neutral", color: "text-slate-500" },
    mal: { label: "😟 Mal", color: "text-rose-500" },
    muy_mal: { label: "😢 Muy mal", color: "text-rose-700" },
}

async function getStudentForTeacher(studentId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id) return null

    const STAFF_ROLES = ["convivencia", "director", "dupla", "inspector", "utp", "admin"]
    const isStaff = STAFF_ROLES.includes(profile.role)

    let student: any = null

    if (isStaff) {
        // Staff can view any student in their institution
        const { data } = await supabase
            .from("students")
            .select("id, name, last_name, rut, birthdate, guardian_name, guardian_phone, guardian_email, course_id, courses(name, level)")
            .eq("id", studentId)
            .eq("institution_id", profile.institution_id)
            .maybeSingle()
        student = data
    } else {
        // Docente: only students in their courses
        const { data: teacherCourses } = await supabase
            .from("course_teachers")
            .select("course_id")
            .eq("teacher_id", user.id)

        if (!teacherCourses?.length) return null
        const courseIds = teacherCourses.map(tc => tc.course_id)

        const { data } = await supabase
            .from("students")
            .select("id, name, last_name, rut, birthdate, guardian_name, guardian_phone, guardian_email, course_id, courses(name, level)")
            .eq("id", studentId)
            .in("course_id", courseIds)
            .maybeSingle()
        student = data
    }

    if (!student) return null

    // Últimos 7 registros emocionales del estudiante
    const { data: recentLogs } = await supabase
        .from("emotional_logs")
        .select("emotion, intensity, type, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(7)

    // PAEC
    const { data: paec } = await supabase
        .from("paec")
        .select(`
            strengths,
            support_routines, support_anticipation, support_visual_aids,
            support_calm_space, support_breaks, key_support,
            trigger_noise, trigger_changes, trigger_orders,
            trigger_social, trigger_sensory, trigger_other,
            strategy_calm_space, strategy_accompaniment,
            strategy_reduce_stimuli, strategy_other,
            review_date, active
        `)
        .eq("student_id", studentId)
        .eq("active", true)
        .maybeSingle()

    // DEC
    const { data: decRecords } = await supabase
        .from("incidents")
        .select(`
            id,
            folio,
            type,
            severity,
            location,
            incident_date,
            end_date,
            resolved,
            users!reporter_id (
                name,
                last_name,
                role
            )
        `)
        .eq("student_id", studentId)
        .order("incident_date", { ascending: false })

    // Convivencia records the student was involved in
    const { data: convivenciaLinks } = await supabase
        .from("convivencia_record_students")
        .select(`
            convivencia_records (
                id, type, severity, location, description,
                involved_count, actions_taken, resolved,
                resolution_notes, incident_date
            )
        `)
        .eq("student_id", studentId)

    const convivenciaRecords = (convivenciaLinks ?? [])
        .map((l: any) => l.convivencia_records)
        .filter(Boolean)

    // Casos de derivación y monitoreo del estudiante
    let casosDerivacionQuery = supabase
        .from("student_cases")
        .select(`
            id,
            reason,
            initial_state,
            status,
            created_at,
            created_by,
            responsable_id,
            creador:users!created_by (name, last_name, role),
            responsable:users!responsable_id (name, last_name, role)
        `)
        .eq("student_id", studentId)
        .eq("institution_id", profile.institution_id)

    // Docente: solo ve casos que él/ella derivó.
    if (profile.role === "docente") {
        casosDerivacionQuery = casosDerivacionQuery.eq("created_by", user.id)
    }

    const { data: casosDerivacion } = await casosDerivacionQuery
        .order("created_at", { ascending: false })

    return {
        student,
        recentLogs: (recentLogs as any[]) ?? [],
        paec,
        decRecords: decRecords ?? [],
        convivenciaRecords: convivenciaRecords ?? [],
        casosDerivacion: casosDerivacion ?? [],
        teacherId: profile.id,
        institutionId: profile.institution_id,
        role: profile.role,
    }
}

export default async function StudentProfilePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getStudentForTeacher(id)

    if (!data) return notFound()

    const { student, recentLogs, paec, decRecords, convivenciaRecords, casosDerivacion, teacherId, institutionId } = data

    // Calcular edad
    let ageText = "No registrada"
    if (student.birthdate) {
        const birthDate = new Date(student.birthdate)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        ageText = `${age} años`
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                <BackButton className="text-slate-600 hover:text-slate-900 -ml-1 mb-2" />

                {/* Encabezado del estudiante */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            {student.name} {student.last_name}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {(student.courses as any)?.name} · {student.rut ?? "Sin RUT"}
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="perfil" className="w-full">
                    <TabsList className={`grid w-full ${data.role === 'docente' ? 'grid-cols-7' : 'grid-cols-6'}`}>
                        <TabsTrigger value="perfil">Perfil</TabsTrigger>
                        <TabsTrigger value="emocional">Emocional</TabsTrigger>
                        <TabsTrigger value="paec">PAEC</TabsTrigger>
                        <TabsTrigger value="dec">Historial DEC</TabsTrigger>
                        <TabsTrigger value="convivencia">Convivencia</TabsTrigger>
                        <TabsTrigger value="derivacion">Derivación</TabsTrigger>
                        {data.role === "docente" && (
                            <TabsTrigger value="docente">Docente</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="perfil" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Datos personales y de contacto</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                                <div>
                                    <p className="text-xs text-slate-400">RUT</p>
                                    <p className="font-medium text-slate-700">{student.rut ?? "No registrado"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Edad</p>
                                    <p className="font-medium text-slate-700">{ageText}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Fecha de Nacimiento</p>
                                    <p className="font-medium text-slate-700">
                                        {student.birthdate
                                            ? new Date(student.birthdate + "T00:00:00").toLocaleDateString("es-CL", { day: '2-digit', month: '2-digit', year: 'numeric' })
                                            : "No registrada"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Correo del estudiante</p>
                                    <p className="font-medium text-slate-700">{student.email ?? "No registrado"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Curso</p>
                                    <p className="font-medium text-slate-700">{(student.courses as any)?.name ?? "No asignado"}</p>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3 border-t pt-4 mt-2">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Apoderado / Contacto de Emergencia</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-xs text-slate-400">Nombre del Apoderado</p>
                                            <p className="font-medium text-slate-700">{student.guardian_name ?? "No registrado"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Teléfono</p>
                                            <p className="font-medium text-slate-700">{student.guardian_phone ?? "No registrado"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Correo Electrónico</p>
                                            <p className="font-medium text-slate-700">{student.guardian_email ?? "No registrado"}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="emocional" className="mt-6 space-y-6">
                        {/* Gráfico emocional últimos 7 días */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Evolución emocional — últimos 7 días</CardTitle>
                                <CardDescription>Emoción, estrés y ansiedad diarios</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentLogs.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        Aún no hay registros recientes.
                                    </p>
                                ) : (
                                    <StudentEmotionChart logs={recentLogs.slice().reverse()} />
                                )}
                            </CardContent>
                        </Card>

                        {/* Últimos registros emocionales */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Registros emocionales recientes</CardTitle>
                                <CardDescription>
                                    Últimos 7 registros del estudiante
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentLogs.length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                        Este estudiante aún no ha registrado emociones.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {recentLogs.map((log, i) => {
                                            const emotion = EMOTION_MAP[log.emotion]
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between rounded-md border px-3 py-2"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-sm font-medium ${emotion?.color}`}
                                                        >
                                                            {emotion?.label ?? log.emotion}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] capitalize"
                                                        >
                                                            {log.type === "weekly" ? "Semanal" : "Diario"}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs text-slate-400">
                                                            😰 {log.stress_level ?? "—"}/5 · 😟 {log.anxiety_level ?? "—"}/5
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                                day: "2-digit",
                                                                month: "short",
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="paec" className="mt-6 space-y-6">
                        {paec ? (
                            <Card className="border-violet-200 bg-violet-50/40">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        📋 Plan de Apoyo Emocional y Conductual (PAEC)
                                    </CardTitle>
                                    {paec.review_date && (
                                        <CardDescription>
                                            Próxima revisión: {new Date(paec.review_date).toLocaleDateString("es-CL")}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    {paec.strengths && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fortalezas</p>
                                            <p className="text-slate-700">{paec.strengths}</p>
                                        </div>
                                    )}
                                    {/* Apoyos activos */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Apoyos activos</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {paec.support_routines && <Badge variant="secondary">Rutinas</Badge>}
                                            {paec.support_anticipation && <Badge variant="secondary">Anticipación</Badge>}
                                            {paec.support_visual_aids && <Badge variant="secondary">Apoyos visuales</Badge>}
                                            {paec.support_calm_space && <Badge variant="secondary">Espacio calma</Badge>}
                                            {paec.support_breaks && <Badge variant="secondary">Pausas activas</Badge>}
                                            {!paec.support_routines && !paec.support_anticipation && !paec.support_visual_aids &&
                                                !paec.support_calm_space && !paec.support_breaks && (
                                                    <span className="text-slate-400 text-xs">Sin apoyos registrados</span>
                                                )}
                                        </div>
                                    </div>
                                    {/* Desencadenantes */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Desencadenantes conocidos</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {paec.trigger_noise && <Badge variant="outline" className="border-rose-300 text-rose-600">Ruido</Badge>}
                                            {paec.trigger_changes && <Badge variant="outline" className="border-rose-300 text-rose-600">Cambios</Badge>}
                                            {paec.trigger_orders && <Badge variant="outline" className="border-rose-300 text-rose-600">Órdenes directas</Badge>}
                                            {paec.trigger_social && <Badge variant="outline" className="border-rose-300 text-rose-600">Interacción social</Badge>}
                                            {paec.trigger_sensory && <Badge variant="outline" className="border-rose-300 text-rose-600">Sensorial</Badge>}
                                            {paec.trigger_other && <Badge variant="outline" className="border-rose-300 text-rose-600">{paec.trigger_other}</Badge>}
                                            {!paec.trigger_noise && !paec.trigger_changes && !paec.trigger_orders &&
                                                !paec.trigger_social && !paec.trigger_sensory && !paec.trigger_other && (
                                                    <span className="text-slate-400 text-xs">No registrados</span>
                                                )}
                                        </div>
                                    </div>
                                    {/* Estrategias */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Estrategias de intervención</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {paec.strategy_calm_space && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Espacio calma</Badge>}
                                            {paec.strategy_accompaniment && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Acompañamiento</Badge>}
                                            {paec.strategy_reduce_stimuli && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Reducir estímulos</Badge>}
                                            {paec.strategy_other && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{paec.strategy_other}</Badge>}
                                        </div>
                                    </div>
                                    {paec.key_support && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Apoyo clave</p>
                                            <p className="text-slate-700">{paec.key_support}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-dashed">
                                <CardContent className="py-6 text-center text-sm text-slate-400">
                                    📋 Este estudiante no tiene un PAEC activo registrado.
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="dec" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Historial de Incidentes DEC</CardTitle>
                                <CardDescription>Registro de desregulaciones emocionales y conductuales</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {(!decRecords || decRecords.length === 0) ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        No hay incidentes DEC registrados para este estudiante.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {decRecords.map((dec) => (
                                            <div key={dec.id} className="border rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-sm text-slate-900">{dec.folio}</span>
                                                        <Badge variant="outline" className={`text-[10px] ${dec.severity === "moderada" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                                            dec.severity === "severa" ? "bg-rose-100 text-rose-700 border-rose-200" :
                                                                "bg-slate-100 text-slate-700"
                                                            }`}>
                                                            {dec.severity === "moderada" ? "Etapa 2 — Moderada" :
                                                                dec.severity === "severa" ? "Etapa 3 — Severa" :
                                                                    dec.severity}
                                                        </Badge>
                                                        <Badge variant="outline" className={`text-[10px] ${dec.resolved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                                            }`}>
                                                            {dec.resolved ? "Resuelto" : "En seguimiento"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        Fecha: {new Date(dec.incident_date).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                        {dec.end_date && ` - ${new Date(dec.end_date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`}
                                                    </p>
                                                    {dec.location && (
                                                        <p className="text-xs text-slate-500 mt-0.5">Lugar: {dec.location}</p>
                                                    )}
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p className="text-xs text-slate-400">Reportado por:</p>
                                                    <p className="text-sm font-medium text-slate-700">
                                                        {(dec.users as any)?.name} {(dec.users as any)?.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 capitalize">{(dec.users as any)?.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="convivencia" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Registros de Convivencia</CardTitle>
                                <CardDescription>Casos de convivencia escolar en que ha sido involucrado</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {convivenciaRecords.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        Sin registros de convivencia asociados a este estudiante.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {convivenciaRecords.map((rec: any) => {
                                            const SEVERITY_COLORS: Record<string, string> = {
                                                leve: "bg-yellow-100 text-yellow-700",
                                                moderada: "bg-orange-100 text-orange-700",
                                                grave: "bg-red-100 text-red-700",
                                            }
                                            const TYPE_LABELS: Record<string, string> = {
                                                pelea: "Pelea", fuga: "Fuga / Escapada",
                                                daño_material: "Daño Material", amenaza: "Amenaza",
                                                acoso: "Acoso", consumo: "Consumo de Sustancias",
                                                conflicto_grupal: "Conflicto Grupal", otro: "Otro",
                                            }
                                            return (
                                                <div key={rec.id} className="border rounded-xl p-4 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-sm text-slate-900">
                                                                {TYPE_LABELS[rec.type] ?? rec.type}
                                                            </span>
                                                            <Badge variant="outline" className={`text-[10px] border-0 ${SEVERITY_COLORS[rec.severity] ?? ""}`}>
                                                                {rec.severity}
                                                            </Badge>
                                                            {rec.resolved && (
                                                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                    Resuelto
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400 shrink-0">
                                                            {new Date(rec.incident_date).toLocaleDateString("es-CL", {
                                                                day: "numeric", month: "short", year: "numeric"
                                                            })}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-slate-600">{rec.description}</p>
                                                    {rec.location && (
                                                        <p className="text-xs text-slate-400">📍 {rec.location}</p>
                                                    )}
                                                    {rec.resolved && rec.resolution_notes && (
                                                        <div className="mt-2 pl-2 border-l-2 border-emerald-300">
                                                            <p className="text-xs font-semibold text-emerald-600">Resolución</p>
                                                            <p className="text-xs text-slate-500">{rec.resolution_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="derivacion" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Derivación y monitoreo</CardTitle>
                                <CardDescription>Historial de casos del estudiante</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {casosDerivacion.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        Este estudiante no tiene casos de derivación registrados.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {casosDerivacion.map((caso: any) => {
                                            const estado = (caso.status ?? "").toString().toLowerCase()
                                            const estadoLabel =
                                                estado === "en_proceso"
                                                    ? "En proceso"
                                                    : estado === "atendido"
                                                        ? "Atendido"
                                                        : estado === "pendiente"
                                                            ? "Pendiente"
                                                            : estado === "cerrado"
                                                                ? "Cerrado"
                                                                : caso.status
                                            const estadoClass =
                                                estado === "cerrado"
                                                    ? "bg-slate-100 text-slate-700 border-slate-200"
                                                    : estado === "en_proceso"
                                                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                                        : estado === "atendido"
                                                            ? "bg-blue-100 text-blue-700 border-blue-200"
                                                            : "bg-amber-100 text-amber-700 border-amber-200"

                                            const urgencia = (caso.initial_state ?? "").toString().toLowerCase()
                                            const urgenciaLabel =
                                                urgencia === "urgente"
                                                    ? "Urgente"
                                                    : urgencia === "observacion"
                                                        ? "Media"
                                                        : "Baja"
                                            const urgenciaClass =
                                                urgencia === "urgente"
                                                    ? "bg-rose-100 text-rose-700 border-rose-200"
                                                    : urgencia === "observacion"
                                                        ? "bg-amber-100 text-amber-700 border-amber-200"
                                                        : "bg-emerald-100 text-emerald-700 border-emerald-200"

                                            return (
                                                <div key={caso.id} className="border rounded-xl p-4 space-y-2">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge variant="outline" className={`text-[10px] ${estadoClass}`}>
                                                                    {estadoLabel}
                                                                </Badge>
                                                                <Badge variant="outline" className={`text-[10px] ${urgenciaClass}`}>
                                                                    {urgenciaLabel}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                Abierto el {new Date(caso.created_at).toLocaleDateString("es-CL", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })}
                                                                {" · "}
                                                                Por {caso.creador?.name} {caso.creador?.last_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Responsable: {caso.responsable ? `${caso.responsable.name} ${caso.responsable.last_name}` : "Sin asignar"}
                                                            </p>
                                                        </div>
                                                        <Link href={`/monitoreo/${caso.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0">
                                                            Ver detalle →
                                                        </Link>
                                                    </div>
                                                    <p className="text-sm text-slate-700">
                                                        {data.role === "docente"
                                                            ? "Información confidencial reservada."
                                                            : caso.reason}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {data.role === "docente" && (
                        <TabsContent value="docente" className="mt-6 space-y-6">
                            {/* Formulario de percepción docente */}
                            <PerceptionForm
                                teacherId={teacherId}
                                studentId={student.id}
                                institutionId={institutionId}
                            />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </main>
    )
}
