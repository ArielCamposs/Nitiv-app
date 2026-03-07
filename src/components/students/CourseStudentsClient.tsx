"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Student {
    id: string
    name: string
    last_name: string
    rut: string | null
    hasAlert?: boolean
    paecCount?: number
    decCount?: number
    convivenciaCount?: number
}

interface Course {
    id: string
    name: string
    level: string
    section: string | null
}

interface Props {
    course: Course
    students: Student[]
    baseUrl: string // e.g., "/docente/estudiantes"
    profileBaseUrl?: string // e.g., "/docente/estudiantes" (as it's universal)
}

export function CourseStudentsClient({ course, students, baseUrl, profileBaseUrl = "/docente/estudiantes" }: Props) {
    const [search, setSearch] = useState("")

    const filtered = useMemo(() => {
        const lowerSearch = search.toLowerCase()
        return students.filter(s => {
            const fullName = `${s.name} ${s.last_name}`.toLowerCase()
            const rut = s.rut?.toLowerCase() || ""
            return fullName.includes(lowerSearch) || rut.includes(lowerSearch)
        })
    }, [students, search])

    const courseName = `${course.name}${course.section ? ` ${course.section}` : ""}`

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={baseUrl}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                    title="Volver a los cursos"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Estudiantes</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {courseName} • {students.length} estudiante{students.length !== 1 ? "s" : ""} en total
                    </p>
                </div>
            </div>

            {/* Búsqueda */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o RUT..."
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
            </div>

            {/* Lista de Estudiantes */}
            {filtered.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm">No se encontraron estudiantes que coincidan con la búsqueda.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left align-middle min-w-[600px]">
                            <thead className="text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-4 w-16">N°</th>
                                    <th className="px-5 py-4">Nombre completo</th>
                                    <th className="px-5 py-4">RUN</th>
                                    <th className="px-5 py-4 text-center w-28 whitespace-nowrap">DEC</th>
                                    <th className="px-5 py-4 text-center w-28 whitespace-nowrap">PAEC</th>
                                    <th className="px-5 py-4 text-center w-40 whitespace-nowrap">REG. CONVIVENCIA</th>
                                    <th className="px-5 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((student, index) => (
                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                                        <td className="px-5 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                {student.last_name} {student.name}
                                                {student.hasAlert && (
                                                    <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" title="Tiene alertas activas" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                                            {student.rut || "-"}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {student.decCount && student.decCount > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 whitespace-nowrap">
                                                    POSEE {student.decCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-medium">-</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {student.paecCount && student.paecCount > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100 whitespace-nowrap">
                                                    POSEE {student.paecCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-medium">-</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {student.convivenciaCount && student.convivenciaCount > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100 whitespace-nowrap">
                                                    POSEE {student.convivenciaCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-medium">-</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Link href={`${profileBaseUrl}/${student.id}`}>
                                                <Button size="sm" variant="outline" className="text-slate-600 hover:text-slate-900 bg-white border-slate-200">
                                                    Ir a perfil
                                                    <ChevronRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
