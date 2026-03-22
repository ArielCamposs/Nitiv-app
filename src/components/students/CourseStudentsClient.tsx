"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CourseStatsAiAssistant } from "./CourseStatsAiAssistant"
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar
} from "recharts"

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

interface CourseStats {
    climaAula: string;
    radarCompetencia: string;
    casosConvivencia: number;
    emotionsDistribution: { name: string; value: number; color: string }[];
    emotionsTrend: { date: string; score: number }[];
    radarAxes: { axis: string; score: number }[];
    totalPaec: number;
    totalDec: number;
}

interface Props {
    course: Course
    students: Student[]
    baseUrl: string // e.g., "/docente/estudiantes"
    profileBaseUrl?: string // e.g., "/docente/estudiantes" (as it's universal)
    stats?: CourseStats
}

export function CourseStudentsClient({ course, students, baseUrl, profileBaseUrl = "/docente/estudiantes", stats }: Props) {
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
                    <h1 className="text-2xl font-semibold text-slate-900">Estudiantes y Estadísticas</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {courseName} • {students.length} estudiante{students.length !== 1 ? "s" : ""} en total
                    </p>
                </div>
            </div>

            <Tabs defaultValue="estudiantes" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="estudiantes">Estudiantes</TabsTrigger>
                    <TabsTrigger value="estadisticas">Estadísticas del Curso</TabsTrigger>
                </TabsList>

                <TabsContent value="estudiantes" className="space-y-6">
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
                </TabsContent>

                <TabsContent value="estadisticas" className="space-y-6">
                    {stats ? (
                        <>
                            {/* Tarjetas de Totales */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total DEC</p>
                                        <p className="text-2xl font-bold text-rose-600">{stats.totalDec}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total PAEC</p>
                                        <p className="text-2xl font-bold text-violet-600">{stats.totalPaec}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Casos Convivencia</p>
                                        <p className="text-2xl font-bold text-amber-600">{stats.casosConvivencia}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Clima General</p>
                                        <p className="text-2xl font-bold text-indigo-600">{stats.climaAula}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Gráficos */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Distribución de Emociones */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold text-slate-700">Distribución de Emociones</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        {stats.emotionsDistribution.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.emotionsDistribution}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {stats.emotionsDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-slate-400">
                                                No hay registros de emociones
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Tendencia de Emociones */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold text-slate-700">Tendencia Emocional</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        {stats.emotionsTrend.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={stats.emotionsTrend}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                                    <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[1, 5]} />
                                                    <RechartsTooltip />
                                                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-slate-400">
                                                No hay tendencia disponible
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Radar de Competencias */}
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold text-slate-700">Radar de Competencias CASEL</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[400px]">
                                        {stats.radarAxes.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarAxes}>
                                                    <PolarGrid />
                                                    <PolarAngleAxis dataKey="axis" fontSize={12} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 5]} />
                                                    <Radar name="Promedio Curso" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                                    <RechartsTooltip />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-slate-400">
                                                No hay respuestas de radar
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Asistente IA */}
                            <CourseStatsAiAssistant courseName={courseName} stats={stats} />
                        </>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                            <p className="text-sm">No hay estadísticas disponibles para este curso.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
