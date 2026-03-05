"use client"

import { useState, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
    Plus, Pencil, Search, GraduationCap,
    ChevronDown, ChevronRight, LayoutList, Layers,
    ChevronsUpDown, Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton"
import { cn } from "@/lib/utils"
import { formatPhone, formatRut } from "@/lib/formatters"
import { logAdminAction } from "@/lib/admin/log-action"
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface Student {
    id: string
    name: string
    last_name: string
    rut: string | null
    birthdate: string | null
    guardian_name: string | null
    guardian_phone: string | null
    guardian_email: string | null
    course_id: string | null
    active: boolean
    created_at: string
}

interface Course { id: string; name: string; level: string; section: string | null; year: number }

const EMPTY_FORM = {
    id: "",
    name: "", last_name: "", rut: "",
    birthdate: "", course_id: "",
    guardian_name: "", guardian_phone: "+56 9 ", guardian_email: "",
    email: "",
    password: "",
}

type FormState = typeof EMPTY_FORM
type ViewMode = "grouped" | "flat"

// ─── Course group component ───────────────────────────────────────────────────
function CourseGroup({
    courseId,
    courseName,
    students,
    isExpanded,
    onToggle,
    expandedStudentId,
    onExpandStudent,
    onEdit,
}: {
    courseId: string
    courseName: string
    students: Student[]
    isExpanded: boolean
    onToggle: () => void
    expandedStudentId: string | null
    onExpandStudent: (id: string | null) => void
    onEdit: (s: Student) => void
}) {

    return (
        <div className={cn(
            "rounded-2xl border overflow-hidden shadow-sm transition-all",
            isExpanded ? "border-indigo-200 bg-white" : "border-slate-100 bg-white"
        )}>
            {/* Course Header */}
            <button
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors",
                    isExpanded
                        ? "bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100"
                        : "hover:bg-slate-50"
                )}
            >
                <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    courseId === "__sin_curso"
                        ? "bg-slate-100 text-slate-500"
                        : "bg-indigo-100 text-indigo-600"
                )}>
                    {courseId === "__sin_curso"
                        ? <GraduationCap className="w-4 h-4" />
                        : <Users className="w-4 h-4" />
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <p className={cn(
                        "font-semibold text-sm",
                        isExpanded ? "text-indigo-900" : "text-slate-800"
                    )}>
                        {courseName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{students.length} estudiante{students.length !== 1 ? "s" : ""}</p>
                </div>

                <ChevronRight className={cn(
                    "w-4 h-4 shrink-0 transition-transform duration-200",
                    isExpanded ? "rotate-90 text-indigo-500" : "text-slate-400"
                )} />
            </button>

            {/* Student List */}
            {isExpanded && (
                <ul className="divide-y divide-slate-50 border-t border-slate-100">
                    {students.map(s => {
                        const isStudentExpanded = expandedStudentId === s.id
                        return (
                            <li key={s.id}>
                                <div className="flex items-center gap-3 px-5 py-3.5">
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-semibold shrink-0">
                                        {s.name[0]}{s.last_name[0]}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 text-sm">
                                            {s.last_name}, {s.name}
                                        </p>
                                        {s.rut && <p className="text-xs text-slate-400 mt-0.5">{s.rut}</p>}
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => onExpandStudent(isStudentExpanded ? null : s.id)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isStudentExpanded && "rotate-180")} />
                                        </button>
                                        <button
                                            onClick={() => onEdit(s)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>

                                        <ResetPasswordButton
                                            studentId={s.id}
                                            studentName={`${s.name} ${s.last_name}`}
                                        />
                                    </div>
                                </div>

                                {/* Detalle expandido */}
                                {isStudentExpanded && (
                                    <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/50 border-t border-slate-100">
                                        {[
                                            { label: "Fecha nac.", value: s.birthdate ? new Date(s.birthdate).toLocaleDateString("es-CL") : "—" },
                                            { label: "Apoderado", value: s.guardian_name ?? "—" },
                                            { label: "Tel. apoderado", value: s.guardian_phone ?? "—" },
                                            { label: "Email apoderado", value: s.guardian_email ?? "—" },
                                            { label: "Estado", value: s.active ? "Activo" : "Inactivo" },
                                            { label: "Ingresó", value: new Date(s.created_at).toLocaleDateString("es-CL") },
                                        ].map(item => (
                                            <div key={item.label} className="pt-3">
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</p>
                                                <p className="text-xs text-slate-700 mt-0.5">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StudentsClient({ students: initial, courses, institutionId, currentYear, availableYears }: {
    students: Student[]
    courses: Course[]
    institutionId: string
    currentYear: number
    availableYears: number[]
}) {
    const supabase = createClient()
    const [students, setStudents] = useState<Student[]>(initial)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [courseFilter, setCourseFilter] = useState("todos")
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>("grouped")
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
    const [yearFilter, setYearFilter] = useState<number>(currentYear)
    const [showEditConfirm, setShowEditConfirm] = useState(false)

    const isEdit = !!form.id

    // Courses of the selected year
    const coursesByYear = useMemo(() =>
        courses.filter(c => c.year === yearFilter)
        , [courses, yearFilter])

    const courseMap = useMemo(() => Object.fromEntries(coursesByYear.map(c => [
        c.id, `${c.name}${c.section ? ` ${c.section}` : ""}`
    ])), [coursesByYear])

    const filtered = useMemo(() => students.filter(s => {
        const matchName = `${s.name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
            || (s.rut ?? "").includes(search)
        const matchCourse = courseFilter === "todos"
            ? coursesByYear.some(c => c.id === s.course_id) || !s.course_id
            : courseFilter === "sin_curso"
                ? !s.course_id
                : s.course_id === courseFilter
        return matchName && matchCourse
    }), [students, search, courseFilter, coursesByYear])

    // Group students by course
    const groups = useMemo(() => {
        const map = new Map<string, { courseId: string; courseName: string; order: number; students: Student[] }>()

        // Build groups in course order — only for selected year
        coursesByYear.forEach((c, idx) => {
            map.set(c.id, {
                courseId: c.id,
                courseName: courseMap[c.id],
                order: idx,
                students: [],
            })
        })

        // Also a group for students without course
        map.set("__sin_curso", { courseId: "__sin_curso", courseName: "Sin curso asignado", order: 9999, students: [] })

        filtered.forEach(s => {
            const key = s.course_id && map.has(s.course_id) ? s.course_id : "__sin_curso"
            map.get(key)!.students.push(s)
        })

        return Array.from(map.values())
            .filter(g => g.students.length > 0)
            .sort((a, b) => a.order - b.order)
    }, [filtered, coursesByYear, courseMap])

    // Auto-expand courses when searching
    useEffect(() => {
        if (search.trim()) {
            const ids = new Set(groups.map(g => g.courseId))
            setExpandedCourses(ids)
        }
    }, [search])

    const expandAll = () => setExpandedCourses(new Set(groups.map(g => g.courseId)))
    const collapseAll = () => setExpandedCourses(new Set())
    const toggleCourse = (id: string) => setExpandedCourses(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
    })

    const openCreate = () => { setForm(EMPTY_FORM); setShowForm(true) }
    const openEdit = (s: Student) => {
        setForm({
            id: s.id, name: s.name, last_name: s.last_name,
            rut: s.rut ? formatRut(s.rut) : "", birthdate: s.birthdate ?? "",
            course_id: s.course_id ?? "",
            guardian_name: s.guardian_name ?? "",
            guardian_phone: s.guardian_phone ? formatPhone(s.guardian_phone) : "+56 9 ",
            guardian_email: s.guardian_email ?? "",
            email: "",
            password: "",
        })
        setShowForm(true)
    }

    const handleSaveClick = () => {
        if (!form.name.trim() || !form.last_name.trim()) {
            toast.warning("Nombre y apellido son obligatorios.")
            return
        }
        if (!isEdit && (!form.email.trim() || !form.password.trim())) {
            toast.warning("Email y contraseña son obligatorios para crear un estudiante.")
            return
        }
        if (!isEdit && form.password.length < 6) {
            toast.warning("La contraseña debe tener al menos 6 caracteres.")
            return
        }
        if (isEdit) {
            setShowEditConfirm(true)
        } else {
            handleSubmit()
        }
    }

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.last_name.trim()) return
        if (!isEdit && (!form.email.trim() || !form.password.trim())) return
        if (!isEdit && form.password.length < 6) return

        setLoading(true)
        try {
            if (isEdit) {
                const prevStudent = students.find(s => s.id === form.id)
                const { data, error } = await supabase
                    .from("students")
                    .update({
                        name: form.name.trim(),
                        last_name: form.last_name.trim(),
                        rut: form.rut.trim() || null,
                        birthdate: form.birthdate || null,
                        course_id: form.course_id || null,
                        guardian_name: form.guardian_name.trim() || null,
                        guardian_phone: form.guardian_phone.trim() === "+56 9" ? null : (form.guardian_phone.trim() || null),
                        guardian_email: form.guardian_email.trim() || null,
                    })
                    .eq("id", form.id)
                    .select("id, name, last_name, rut, birthdate, guardian_name, guardian_phone, guardian_email, course_id, active, created_at")
                    .single()

                if (error) throw error
                setStudents(prev => prev.map(s => s.id === form.id ? data : s))
                await logAdminAction({
                    action: "edit_student",
                    entityType: "student",
                    entityId: form.id,
                    entityDescription: `${form.last_name.trim()}, ${form.name.trim()}`,
                    beforeData: prevStudent ? {
                        name: prevStudent.name, last_name: prevStudent.last_name,
                        rut: prevStudent.rut, birthdate: prevStudent.birthdate,
                        course_id: prevStudent.course_id, guardian_name: prevStudent.guardian_name,
                        guardian_phone: prevStudent.guardian_phone, guardian_email: prevStudent.guardian_email,
                    } : undefined,
                    afterData: {
                        name: form.name.trim(), last_name: form.last_name.trim(),
                        rut: form.rut.trim() || null, birthdate: form.birthdate || null,
                        course_id: form.course_id || null, guardian_name: form.guardian_name.trim() || null,
                        guardian_phone: form.guardian_phone.trim() === "+56 9" ? null : (form.guardian_phone.trim() || null),
                        guardian_email: form.guardian_email.trim() || null,
                    },
                })
                toast.success("Estudiante actualizado.")

            } else {
                const res = await fetch("/api/admin/create-student", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: form.email.trim().toLowerCase(),
                        password: form.password,
                        name: form.name.trim(),
                        last_name: form.last_name.trim(),
                        rut: form.rut.trim() || null,
                        birthdate: form.birthdate || null,
                        course_id: form.course_id || null,
                        guardian_name: form.guardian_name.trim() || null,
                        guardian_phone: form.guardian_phone.trim() === "+56 9" ? null : (form.guardian_phone.trim() || null),
                        guardian_email: form.guardian_email.trim() || null,
                    }),
                })

                const json = await res.json()
                if (!res.ok) throw new Error(json.error ?? "Error al crear estudiante.")

                setStudents(prev => [json.student, ...prev])
                await logAdminAction({
                    action: "create_student",
                    entityType: "student",
                    entityId: json.student.id,
                    entityDescription: `${form.last_name.trim()}, ${form.name.trim()}`,
                    afterData: {
                        name: form.name.trim(), last_name: form.last_name.trim(),
                        email: form.email.trim(), rut: form.rut.trim() || null,
                        course_id: form.course_id || null,
                    },
                })
                toast.success("Estudiante creado. Ya puede iniciar sesión.")
            }

            setShowForm(false)
            setForm(EMPTY_FORM)

        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al guardar.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Estudiantes</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{students.length} estudiante{students.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Year selector */}
                        {availableYears.length > 1 && (
                            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                                {availableYears.map(y => (
                                    <button
                                        key={y}
                                        onClick={() => { setYearFilter(y); setCourseFilter("todos") }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                            yearFilter === y
                                                ? "bg-white shadow-sm text-indigo-600"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>
                        )}
                        <Button onClick={openCreate} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4" /> Nuevo estudiante
                        </Button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o RUT..."
                            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                    <select
                        value={courseFilter}
                        onChange={e => setCourseFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                        <option value="todos">Todos los cursos</option>
                        <option value="sin_curso">Sin curso asignado</option>
                        {coursesByYear.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name}{c.section ? ` ${c.section}` : ""}
                            </option>
                        ))}
                    </select>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode("grouped")}
                            title="Vista agrupada por curso"
                            className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                viewMode === "grouped"
                                    ? "bg-white shadow-sm text-indigo-600"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("flat")}
                            title="Vista de lista"
                            className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                viewMode === "flat"
                                    ? "bg-white shadow-sm text-indigo-600"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── GROUPED VIEW ── */}
                {viewMode === "grouped" && (
                    <div className="space-y-3">
                        {/* Expand / Collapse all */}
                        {groups.length > 0 && (
                            <div className="flex justify-end">
                                <button
                                    onClick={expandedCourses.size === groups.length ? collapseAll : expandAll}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    <ChevronsUpDown className="w-3.5 h-3.5" />
                                    {expandedCourses.size === groups.length ? "Contraer todo" : "Expandir todo"}
                                </button>
                            </div>
                        )}

                        {groups.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No hay estudiantes que coincidan</p>
                            </div>
                        ) : (
                            groups.map(g => (
                                <CourseGroup
                                    key={g.courseId}
                                    courseId={g.courseId}
                                    courseName={g.courseName}
                                    students={g.students}
                                    isExpanded={expandedCourses.has(g.courseId)}
                                    onToggle={() => toggleCourse(g.courseId)}
                                    expandedStudentId={expandedStudentId}
                                    onExpandStudent={setExpandedStudentId}
                                    onEdit={openEdit}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* ── FLAT VIEW ── */}
                {viewMode === "flat" && (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        {filtered.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No hay estudiantes que coincidan</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {filtered.map(s => {
                                    const isExpanded = expandedStudentId === s.id
                                    const courseName = s.course_id ? courseMap[s.course_id] : null
                                    return (
                                        <li key={s.id}>
                                            <div className="flex items-center gap-3 px-5 py-3.5">
                                                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-semibold shrink-0">
                                                    {s.name[0]}{s.last_name[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-800 text-sm">
                                                        {s.last_name}, {s.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {courseName ? (
                                                            <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full font-medium">
                                                                {courseName}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400">Sin curso</span>
                                                        )}
                                                        {s.rut && <span className="text-xs text-slate-400">{s.rut}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => setExpandedStudentId(isExpanded ? null : s.id)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(s)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <ResetPasswordButton
                                                        studentId={s.id}
                                                        studentName={`${s.name} ${s.last_name}`}
                                                    />
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/50 border-t border-slate-100">
                                                    {[
                                                        { label: "Fecha nac.", value: s.birthdate ? new Date(s.birthdate).toLocaleDateString("es-CL") : "—" },
                                                        { label: "Apoderado", value: s.guardian_name ?? "—" },
                                                        { label: "Tel. apoderado", value: s.guardian_phone ?? "—" },
                                                        { label: "Email apoderado", value: s.guardian_email ?? "—" },
                                                        { label: "Estado", value: s.active ? "Activo" : "Inactivo" },
                                                        { label: "Ingresó", value: new Date(s.created_at).toLocaleDateString("es-CL") },
                                                    ].map(item => (
                                                        <div key={item.label} className="pt-3">
                                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</p>
                                                            <p className="text-xs text-slate-700 mt-0.5">{item.value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                )}

                {/* Modal formulario */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
                        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl my-auto">
                            <div className="flex items-center justify-between px-6 py-4 border-b">
                                <h2 className="text-base font-semibold text-slate-900">
                                    {isEdit ? "Editar estudiante" : "Nuevo estudiante"}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Datos del estudiante</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { key: "name", label: "Nombre *", placeholder: "Juan", type: "text" },
                                        { key: "last_name", label: "Apellido *", placeholder: "Pérez", type: "text" },
                                        { key: "rut", label: "RUT", placeholder: "12.345.678-9", type: "text" },
                                        { key: "birthdate", label: "Fecha nac.", placeholder: "", type: "date" },
                                    ] as const).map(f => (
                                        <div key={f.key} className="space-y-1">
                                            <label className="text-xs font-medium text-slate-700">{f.label}</label>
                                            <input
                                                type={f.type}
                                                value={form[f.key]}
                                                onChange={e => {
                                                    let val = e.target.value;
                                                    if (f.key === "rut") val = formatRut(val);
                                                    setForm(p => ({ ...p, [f.key]: val }));
                                                }}
                                                placeholder={f.placeholder}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Curso */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Curso</label>
                                    <select
                                        value={form.course_id}
                                        onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    >
                                        <option value="">Sin curso asignado</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}{c.section ? ` ${c.section}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Acceso al sistema — solo al crear */}
                                {!isEdit && (
                                    <>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">
                                            Acceso al sistema
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1 col-span-2 md:col-span-1">
                                                <label className="text-xs font-medium text-slate-700">Email de acceso *</label>
                                                <input
                                                    type="email"
                                                    value={form.email}
                                                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                                    placeholder="estudiante@colegio.cl"
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                />
                                            </div>
                                            <div className="space-y-1 col-span-2 md:col-span-1">
                                                <label className="text-xs font-medium text-slate-700">Contraseña temporal *</label>
                                                <input
                                                    type="text"
                                                    value={form.password}
                                                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                                    placeholder="Mín. 6 caracteres"
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                />
                                                <p className="text-[10px] text-slate-400">
                                                    Comparte estos datos con el estudiante para que ingrese.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Apoderado */}
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">Datos del apoderado</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { key: "guardian_name", label: "Nombre apoderado", placeholder: "María González", wide: true },
                                        { key: "guardian_phone", label: "Teléfono", placeholder: "+56 9 1234 5678", wide: false },
                                        { key: "guardian_email", label: "Email", placeholder: "apoderado@mail.cl", wide: false },
                                    ] as const).map(f => (
                                        <div key={f.key} className={cn("space-y-1", f.wide && "col-span-2 md:col-span-1")}>
                                            <label className="text-xs font-medium text-slate-700">{f.label}</label>
                                            <input
                                                value={form[f.key]}
                                                onChange={e => {
                                                    let val = e.target.value;
                                                    if (f.key === "guardian_phone") val = formatPhone(val);
                                                    setForm(p => ({ ...p, [f.key]: val }));
                                                }}
                                                placeholder={f.placeholder}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                    <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                                    <Button size="sm" onClick={handleSaveClick} disabled={loading}
                                        className="bg-indigo-600 hover:bg-indigo-700">
                                        {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear estudiante"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmación — guardar edición */}
            <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar cambios</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas guardar los cambios de{" "}
                            <strong>{form.last_name}, {form.name}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { setShowEditConfirm(false); handleSubmit() }}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Sí, guardar cambios
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


        </>
    )
}
