import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: NextRequest) {
    try {
        const { courseName, stats } = await req.json()

        if (!courseName || !stats) {
            return NextResponse.json({ error: "Faltan datos del curso o estadísticas" }, { status: 400 })
        }

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

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                {
                    text:
                        "No se encontró la configuración de la IA en el servidor (falta OPENROUTER_API_KEY). Por ahora, revisa los gráficos y promedios para orientar tus decisiones.",
                },
                { status: 200 }
            )
        }

        // Preparar el resumen de los datos para la IA
        const resumen = `
Curso: ${courseName}

1. Clima de Aula (Check-ins emocionales):
- Estado general: ${stats.climaAula}
- Distribución de emociones en los últimos 30 días:
${stats.emotionsDistribution.map((e: any) => `  * ${e.name}: ${e.value} registros`).join('\n')}

2. Radar de Competencias (CASEL):
- Puntaje promedio general: ${stats.radarCompetencia}
- Desglose por eje (escala 1 a 5):
${stats.radarAxes.map((a: any) => `  * ${a.axis}: ${a.score}`).join('\n')}

3. Convivencia y Seguimiento:
- Total de casos de convivencia registrados: ${stats.casosConvivencia}
- Total de estudiantes con PAEC (Plan de Acompañamiento): ${stats.totalPaec}
- Total de estudiantes con DEC (Derivación a Evaluación): ${stats.totalDec}
`.trim()

        const prompt = `
Eres un/a especialista en convivencia escolar y clima de aula que apoya a equipos docentes y directivos en colegios de Chile.

Con el siguiente resumen de estadísticas integrales de un curso (que incluye clima emocional, competencias socioemocionales CASEL y registros de convivencia), entrega un análisis y recomendaciones específicas, enfocadas principalmente en orientar a los DOCENTES del curso.

CONDICIONES:
- No menciones nombres de docentes ni estudiantes; habla siempre del "curso" y del "equipo docente".
- Usa un tono profesional, claro, empático y constructivo.
- Usa siempre español de Chile.
- No inventes datos fuera del resumen; si hay métricas en 0 o sin datos, sugiere cómo empezar a recopilarlos.
- Incluye al final una breve nota aclaratoria indicando que estas son solo recomendaciones basadas en datos cuantitativos y que el criterio profesional del docente siempre debe primar.

FORMATO DE RESPUESTA (mantén estos subtítulos):
1. Análisis General del Curso (breve diagnóstico uniendo todos los datos)
2. Fortalezas Detectadas
3. Focos de Atención (alertas basadas en el clima, radar o casos de convivencia)
4. Recomendaciones Prácticas para Docentes (acciones concretas para el aula)

Este es el resumen de datos para este curso:

${resumen}
`.trim()

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://nitiv.app",
                "X-Title": "Nitiv Estadísticas Curso",
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "Eres un/a especialista en convivencia escolar y clima de aula que apoya a equipos docentes y directivos en colegios de Chile.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.4,
                max_tokens: 1200,
            }),
        })

        if (!response.ok) {
            const text = await response.text()
            console.error("Error OpenRouter:", text)
            return NextResponse.json(
                {
                    text:
                        "Hubo un problema al conectarse con la IA. Revisa la configuración del servicio o inténtalo nuevamente en unos minutos.",
                },
                { status: 200 }
            )
        }

        const data = await response.json()
        const aiText =
            data?.choices?.[0]?.message?.content ??
            "No se pudo obtener una respuesta útil de la IA en este momento."

        return NextResponse.json({ text: aiText })
    } catch (error) {
        console.error("Error en /api/ai/course-stats:", error)
        return NextResponse.json(
            {
                text:
                    "Ocurrió un error inesperado al generar la recomendación. Intenta nuevamente y, si persiste, informa al equipo técnico.",
            },
            { status: 200 }
        )
    }
}
