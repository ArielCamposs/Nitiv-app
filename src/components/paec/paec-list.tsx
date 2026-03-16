"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const DAYS_NEAR_REVIEW = 7

type Paec = {
    id: string
    student_id: string
    created_at: string
    review_date: string | null
    requires_adjustments?: boolean
    active: boolean
    representative_signed: boolean
    guardian_signed: boolean
    students: {
        name: string
        last_name: string
        rut: string | null
        courses: { name: string; level: string } | null
    } | null
}

type Props = {
    paecs: Paec[]
}

function getStudentFullName(paec: Paec): string {
    if (!paec.students) return ""
    return `${paec.students.last_name} ${paec.students.name}`.trim().toLowerCase()
}

/** true si la revisión es "cercana": ya pasó o está dentro de los próximos DAYS_NEAR_REVIEW días */
function isReviewNear(paec: Paec): boolean {
    if (!paec.review_date) return false
    const review = new Date(paec.review_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limit = new Date(today)
    limit.setDate(limit.getDate() + DAYS_NEAR_REVIEW)
    return review <= limit
}

/** Orden: 1) con revisión cercana (por fecha asc), 2) con revisión más lejana (por fecha asc), 3) sin fecha */
function sortPaecs(paecs: Paec[]): Paec[] {
    return [...paecs].sort((a, b) => {
        const aNear = isReviewNear(a)
        const bNear = isReviewNear(b)
        if (aNear && !bNear) return -1
        if (!aNear && bNear) return 1
        const aDate = a.review_date ? new Date(a.review_date).getTime() : Infinity
        const bDate = b.review_date ? new Date(b.review_date).getTime() : Infinity
        return aDate - bDate
    })
}

export function PaecList({ paecs }: Props) {
    const [search, setSearch] = useState("")
    const [onlyRequiresAdjustments, setOnlyRequiresAdjustments] = useState(false)
    const [courseFilter, setCourseFilter] = useState<string>("")

    const availableCourses = useMemo(() => {
        const set = new Set<string>()
        for (const p of paecs) {
            const name = p.students?.courses?.name
            if (name) set.add(name)
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "es"))
    }, [paecs])

    const filteredAndSorted = useMemo(() => {
        let list = paecs
        const q = search.trim().toLowerCase()
        if (q) {
            list = list.filter((p) => getStudentFullName(p).includes(q))
        }
        if (courseFilter) {
            list = list.filter((p) => p.students?.courses?.name === courseFilter)
        }
        if (onlyRequiresAdjustments) {
            list = list.filter((p) => p.requires_adjustments === true)
        }
        return sortPaecs(list)
    }, [paecs, search, onlyRequiresAdjustments, courseFilter])

    if (paecs.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
                <p className="text-sm text-slate-400">
                    No hay PAEC registrados todavía.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Buscar por nombre del estudiante"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Curso</span>
                        <select
                            value={courseFilter}
                            onChange={(e) => setCourseFilter(e.target.value)}
                            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Todos</option>
                            {availableCourses.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={onlyRequiresAdjustments}
                            onChange={(e) => setOnlyRequiresAdjustments(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-600">Solo los que requieren ajustes</span>
                    </label>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
            {filteredAndSorted.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed border-slate-200 py-8 text-center">
                    <p className="text-sm text-slate-500">Ningún PAEC coincide con los filtros.</p>
                </div>
            ) : (
            filteredAndSorted.map((paec) => (
                <Link key={paec.id} href={`/paec/${paec.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                        <CardContent className="py-4 px-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {paec.students
                                            ? `${paec.students.last_name}, ${paec.students.name}`
                                            : "Estudiante desconocido"}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {paec.students?.courses?.name ?? "Sin curso"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1">
                                {paec.requires_adjustments && (
                                    <Badge className="text-[10px] bg-amber-100 text-amber-800">
                                        Requiere ajustes
                                    </Badge>
                                )}
                                {paec.representative_signed && (
                                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
                                        Firmado establecimiento ✓
                                    </Badge>
                                )}
                                {paec.guardian_signed && (
                                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
                                        Firmado apoderado ✓
                                    </Badge>
                                )}
                                {(!paec.representative_signed || !paec.guardian_signed) && (
                                    <Badge className="text-[10px] bg-amber-100 text-amber-700">
                                        Pendiente firma
                                    </Badge>
                                )}
                            </div>

                            <p className="text-xs text-slate-400">
                                Creado:{" "}
                                {new Date(paec.created_at).toLocaleDateString("es-CL", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </p>

                            {paec.review_date && (
                                <p className="text-xs text-slate-400">
                                    Próxima revisión:{" "}
                                    {new Date(paec.review_date).toLocaleDateString("es-CL", {
                                        day: "2-digit",
                                        month: "short",
                                    })}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </Link>
            ))
            )}
        </div>
        </div>
    )
}
