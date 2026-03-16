import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getDecStats } from "@/lib/dec-stats"

export async function POST() {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // ignore
                        }
                    },
                },
            }
        )

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from("users")
            .select("institution_id")
            .eq("id", user.id)
            .maybeSingle()

        if (!profile?.institution_id) {
            return NextResponse.json({ error: "Perfil sin institución" }, { status: 400 })
        }

        const stats = await getDecStats(profile.institution_id)
        const year = new Date().getFullYear()

        const lines: string[] = []
        lines.push(`Estadísticas DEC — Período: año ${year}.`)
        lines.push(`Total de casos DEC en el período: ${stats.totalPeriodDecs}.`)
        lines.push("")

        if (stats.topCourses.length > 0) {
            lines.push("Cursos con más incidentes DEC:")
            stats.topCourses.forEach((c, i) => lines.push(`  ${i + 1}. ${c.courseName}: ${c.count} casos.`))
            lines.push("")
        }

        const severityWithData = stats.decsBySeverity.filter((d) => d.count > 0)
        if (severityWithData.length > 0) {
            lines.push("DECs por severidad:")
            severityWithData.forEach((d) => lines.push(`  - ${d.name}: ${d.count}.`))
            lines.push("")
        }

        if (stats.monthlyTrend.some((m) => m.decs > 0)) {
            lines.push("Tendencia mensual (casos DEC registrados por mes):")
            stats.monthlyTrend.forEach((m) => {
                if (m.decs > 0) {
                    lines.push(`  ${m.mes}: ${m.decs} casos.`)
                }
            })
            lines.push("")
        }

        if (stats.topStudentsByDecs.length > 0) {
            lines.push("Estudiantes con más DEC en el período:")
            stats.topStudentsByDecs.slice(0, 10).forEach((s, i) =>
                lines.push(`  ${i + 1}. ${s.studentName} (${s.courseName}): ${s.count} DECs.`)
            )
            lines.push("")
        }

        if (stats.topConductTypes.length > 0) {
            lines.push("Conductas observadas más registradas:")
            stats.topConductTypes.forEach((t) => lines.push(`  - ${t.name}: ${t.count}.`))
            lines.push("")
        }

        if (stats.topTriggers.length > 0) {
            lines.push("Situaciones desencadenantes más registradas:")
            stats.topTriggers.forEach((t) => lines.push(`  - ${t.name}: ${t.count}.`))
            lines.push("")
        }

        if (stats.topActions.length > 0) {
            lines.push("Acciones realizadas más registradas:")
            stats.topActions.forEach((a) => lines.push(`  - ${a.name}: ${a.count}.`))
        }

        const resumen = lines.join("\n")

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                {
                    text: "No se encontró la configuración de la IA en el servidor (falta OPENROUTER_API_KEY). Revisa las estadísticas para orientar tus decisiones.",
                },
                { status: 200 }
            )
        }

        const prompt = `
Actúa como especialista en convivencia escolar y aprendizaje socioemocional (SEL) para instituciones educativas en Chile.

Analiza las estadísticas agregadas de casos DEC (Desregulación Emocional y Conductual) del establecimiento y entrega un análisis útil para equipos de dupla psicosocial, convivencia escolar y docentes.

Tareas:

1. RESUMEN DE DATOS
Sintetiza lo que muestran las estadísticas: cursos más afectados, tendencias temporales, conductas y desencadenantes frecuentes, estudiantes con mayor número de registros y acciones aplicadas. Usa solo los datos entregados.

2. PATRONES DE ACCIÓN (MARCO CASEL)
Propón acciones concretas para el equipo educativo basadas en las 5 competencias CASEL:
- Autoconciencia
- Autogestión
- Conciencia social
- Habilidades relacionales
- Toma de decisiones responsable

3. ORIENTACIONES PARA EL EQUIPO
Sugiere acciones prácticas para:
- Dupla psicosocial / convivencia
- Trabajo en aula
- Vinculación con familias

Condiciones:
- Usa lenguaje profesional claro en español de Chile.
- No menciones estudiantes ni cursos específicos; habla en términos agregados.
- No inventes información.
- Si los datos son escasos, indícalo y recomienda mejorar el registro.

Formato de respuesta:

1. Resumen de estadísticas DEC
2. Patrones de acción (según CASEL)
3. Recomendaciones para dupla y convivencia
4. Recomendaciones para aula y familias

Datos de estadísticas DEC:

${resumen}
`.trim()

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://nitiv.app",
                "X-Title": "Nitiv DEC Estadísticas",
            },
            body: JSON.stringify({
                model: "openai/gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "Eres un/a especialista en convivencia escolar y aprendizaje socioemocional (SEL/CASEL) que apoya a equipos educativos en Chile.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.4,
                max_tokens: 1800,
            }),
        })

        if (!response.ok) {
            const text = await response.text()
            console.error("Error OpenRouter:", text)
            return NextResponse.json(
                {
                    text: "Hubo un problema al conectarse con la IA. Revisa la configuración del servicio o inténtalo más tarde.",
                },
                { status: 200 }
            )
        }

        const data = await response.json()
        const aiText =
            data?.choices?.[0]?.message?.content ??
            "No se pudo obtener una respuesta de la IA en este momento."

        return NextResponse.json({ text: aiText })
    } catch (error) {
        console.error("Error en /api/ai/dec-stats:", error)
        return NextResponse.json(
            {
                text: "Ocurrió un error inesperado al generar el análisis. Intenta nuevamente y, si persiste, informa al equipo técnico.",
            },
            { status: 200 }
        )
    }
}
