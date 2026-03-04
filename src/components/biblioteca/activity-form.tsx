"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function ActivityForm({
    initialData,
    institutionId
}: {
    initialData?: any,
    institutionId: string
}) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const [form, setForm] = useState({
        title: initialData?.title || "",
        eje: initialData?.eje || "",
        objective: initialData?.objective || "",
        duration_info: initialData?.duration_info || "",
        template: initialData?.template || "none",
        content: {
            rompehielo: {
                time: initialData?.content?.rompehielo?.time || "",
                text: initialData?.content?.rompehielo?.text || ""
            },
            desarrollo: {
                time: initialData?.content?.desarrollo?.time || "",
                intro: initialData?.content?.desarrollo?.intro || "",
                steps: initialData?.content?.desarrollo?.steps || [""]
            },
            cierre: {
                time: initialData?.content?.cierre?.time || "",
                text: initialData?.content?.cierre?.text || ""
            },
            ticketSalida: initialData?.content?.ticketSalida || ""
        }
    })

    const handleStepChange = (index: number, value: string) => {
        const newSteps = [...form.content.desarrollo.steps]
        newSteps[index] = value
        setForm({
            ...form,
            content: {
                ...form.content,
                desarrollo: {
                    ...form.content.desarrollo,
                    steps: newSteps
                }
            }
        })
    }

    const handleAddStep = () => {
        setForm({
            ...form,
            content: {
                ...form.content,
                desarrollo: {
                    ...form.content.desarrollo,
                    steps: [...form.content.desarrollo.steps, ""]
                }
            }
        })
    }

    const handleRemoveStep = (index: number) => {
        if (form.content.desarrollo.steps.length === 1) return
        const newSteps = form.content.desarrollo.steps.filter((_: string, i: number) => i !== index)
        setForm({
            ...form,
            content: {
                ...form.content,
                desarrollo: {
                    ...form.content.desarrollo,
                    steps: newSteps
                }
            }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            const payload = {
                title: form.title,
                eje: form.eje,
                objective: form.objective,
                duration_info: form.duration_info,
                template: form.template,
                content: form.content,
                institution_id: institutionId,
                created_by: user?.id,
                updated_at: new Date().toISOString()
            }

            if (initialData?.id) {
                // Edit
                const { error } = await supabase
                    .from("biblioteca_activities")
                    .update(payload)
                    .eq("id", initialData.id)

                if (error) throw error
                toast.success("Actividad actualizada correctamente")
                router.push(`/biblioteca/${initialData.id}`)
            } else {
                // Create
                const { data, error } = await supabase
                    .from("biblioteca_activities")
                    .insert(payload)
                    .select("id")
                    .single()

                if (error) throw error
                toast.success("Actividad creada correctamente")
                router.push(`/biblioteca/${data.id}`)
            }
            router.refresh()
        } catch (error) {
            console.error("Error saving activity:", error)
            toast.error("Ocurrió un error al guardar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                <Link
                    href="/biblioteca"
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Link>

                <Button type="submit" disabled={loading} className="gap-2">
                    <Save className="w-4 h-4" />
                    {loading ? "Guardando..." : "Guardar Actividad"}
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <h3 className="font-semibold text-slate-800">Información General</h3>

                            <div className="space-y-2">
                                <Label>Título de la actividad</Label>
                                <Input
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="Ej: El Termómetro de mi Energía"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Eje temático</Label>
                                <Input
                                    required
                                    value={form.eje}
                                    onChange={(e) => setForm({ ...form, eje: e.target.value })}
                                    placeholder="Ej: Autoconciencia y Emociones"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Duración</Label>
                                <Input
                                    required
                                    value={form.duration_info}
                                    onChange={(e) => setForm({ ...form, duration_info: e.target.value })}
                                    placeholder="Ej: 45 min"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Plantilla Imprimible Requerida</Label>
                                <Select
                                    value={form.template}
                                    onValueChange={(val) => setForm({ ...form, template: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin plantilla impresa</SelectItem>
                                        <SelectItem value="armadura">Armadura de Fortalezas</SelectItem>
                                        <SelectItem value="gafas">Gafas de Perspectivas</SelectItem>
                                        <SelectItem value="termometro">Termómetro de Energía</SelectItem>
                                        <SelectItem value="mapa">Mapa de Identidad</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Objetivo Principal</Label>
                                <Textarea
                                    required
                                    rows={3}
                                    value={form.objective}
                                    onChange={(e) => setForm({ ...form, objective: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Sections */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-t-4 border-amber-400">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-slate-800 w-1/3">1. Rompehielo</h3>
                                <div className="w-2/3">
                                    <Input
                                        placeholder="Duración (Ej: 5 min)"
                                        value={form.content.rompehielo.time}
                                        onChange={(e) => setForm({
                                            ...form,
                                            content: { ...form.content, rompehielo: { ...form.content.rompehielo, time: e.target.value } }
                                        })}
                                    />
                                </div>
                            </div>
                            <Textarea
                                placeholder="Escribe las instrucciones iniciales..."
                                value={form.content.rompehielo.text}
                                onChange={(e) => setForm({
                                    ...form,
                                    content: { ...form.content, rompehielo: { ...form.content.rompehielo, text: e.target.value } }
                                })}
                                rows={3}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-indigo-500">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-slate-800 w-1/3">2. Desarrollo</h3>
                                <div className="w-2/3">
                                    <Input
                                        placeholder="Duración (Ej: 25 min)"
                                        value={form.content.desarrollo.time}
                                        onChange={(e) => setForm({
                                            ...form,
                                            content: { ...form.content, desarrollo: { ...form.content.desarrollo, time: e.target.value } }
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Introducción del desarrollo</Label>
                                <Input
                                    placeholder="Explicación inicial..."
                                    value={form.content.desarrollo.intro}
                                    onChange={(e) => setForm({
                                        ...form,
                                        content: { ...form.content, desarrollo: { ...form.content.desarrollo, intro: e.target.value } }
                                    })}
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label>Pasos (Agrega los pasos numerados)</Label>
                                {form.content.desarrollo.steps.map((step: string, idx: number) => (
                                    <div key={idx} className="flex gap-2 items-start">
                                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-indigo-50 text-indigo-700 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <Textarea
                                            value={step}
                                            onChange={(e) => handleStepChange(idx, e.target.value)}
                                            rows={2}
                                            className="flex-1"
                                            placeholder="Descripción del paso"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveStep(idx)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddStep}
                                    className="gap-2 mt-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Paso
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-emerald-500">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-slate-800 w-1/3">3. Cierre Reflexivo</h3>
                                <div className="w-2/3">
                                    <Input
                                        placeholder="Duración (Ej: 10 min)"
                                        value={form.content.cierre.time}
                                        onChange={(e) => setForm({
                                            ...form,
                                            content: { ...form.content, cierre: { ...form.content.cierre, time: e.target.value } }
                                        })}
                                    />
                                </div>
                            </div>
                            <Textarea
                                placeholder="Reflexión de cierre..."
                                value={form.content.cierre.text}
                                onChange={(e) => setForm({
                                    ...form,
                                    content: { ...form.content, cierre: { ...form.content.cierre, text: e.target.value } }
                                })}
                                rows={3}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-slate-700 bg-slate-800 text-white">
                        <CardContent className="pt-6 space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                Ticket de Salida Nitiv
                            </h3>
                            <Textarea
                                placeholder="Escribe el mensaje o pregunta para que el estudiante evalúe la actividad"
                                value={form.content.ticketSalida}
                                onChange={(e) => setForm({
                                    ...form,
                                    content: { ...form.content, ticketSalida: e.target.value }
                                })}
                                rows={2}
                                className="bg-slate-700 border-none text-white placeholder:text-slate-400"
                            />
                        </CardContent>
                    </Card>

                </div>
            </div>
        </form>
    )
}
