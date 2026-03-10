import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1,
    apatica: 2,
    inquieta: 3,
    regulada: 4,
}

export async function POST(req: NextRequest) {
    try {
        const { courseId } = await req.json()

        if (!courseId) {
            return NextResponse.json({ error: "Falta courseId" }, { status: 400 })
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

        const { data: profile } = await supabase
            .from("users")
            .select("institution_id")
            .eq("id", user.id)
            .maybeSingle()

        if (!profile?.institution_id) {
            return NextResponse.json({ error: "Perfil sin institución" }, { status: 400 })
        }

        const { data: course } = await supabase
            .from("courses")
            .select("id, name, section, level")
            .eq("id", courseId)
            .eq("institution_id", profile.institution_id)
            .maybeSingle()

        if (!course) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 })
        }

        const since90 = new Date()
        since90.setDate(since90.getDate() - 90)
        const sinceStr = since90.toISOString().split("T")[0]

        const { data: logs } = await supabase
            .from("teacher_logs")
            .select("energy_level, log_date, block_number, session_time, teacher_id")
            .eq("institution_id", profile.institution_id)
            .eq("course_id", courseId)
            .gte("log_date", sinceStr)
            .order("log_date", { ascending: true })

        const courseName = `${course.name} ${course.section ?? ""}`.trim()
        const total = logs?.length ?? 0

        if (!logs || total === 0) {
            return NextResponse.json({
                text: `Para el curso ${courseName} no hay registros de clima de aula en los últimos 90 días. Te sugiero incentivar a los/las docentes a registrar el clima de forma sistemática para poder ofrecer recomendaciones más precisas.`,
            })
        }

        const byEnergy: Record<string, number> = {
            explosiva: 0,
            apatica: 0,
            inquieta: 0,
            regulada: 0,
        }

        let sumScore = 0
        let firstDate: string | null = null
        let lastDate: string | null = null

        for (const log of logs) {
            const level = (log as any).energy_level || "regulada"
            if (byEnergy[level] != null) {
                byEnergy[level] += 1
            }
            sumScore += ENERGY_SCORE[level] ?? 3

            const d = (log as any).log_date as string
            if (!firstDate || d < firstDate) firstDate = d
            if (!lastDate || d > lastDate) lastDate = d
        }

        const avg = total > 0 ? sumScore / total : 0
        const dominant =
            Object.entries(byEnergy)
                .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

        const energyLabels: Record<string, string> = {
            explosiva: "explosiva (mucha tensión o descontrol)",
            apatica: "apática (baja motivación o desconexión)",
            inquieta: "inquieta (ruido o dispersión alta)",
            regulada: "regulada (clima adecuado para aprender)",
        }

        const distTexto = Object.entries(byEnergy)
            .filter(([, count]) => count > 0)
            .map(([key, count]) => {
                const pct = Math.round((count / total) * 100)
                return `${pct}% de los registros con energía ${energyLabels[key] ?? key}`
            })
            .join("; ")

        const periodoTexto =
            firstDate && lastDate && firstDate !== lastDate
                ? `entre el ${firstDate} y el ${lastDate}`
                : `en los últimos 90 días`

        const resumen = `
Curso: ${courseName}.
Período analizado: ${periodoTexto}.
Total de registros de clima de aula: ${total}.
Promedio de energía (escala 1–4, donde 1=explosiva, 2=apática, 3=inquieta, 4=regulada): ${avg.toFixed(
            2
        )}.
Clima predominante según los registros: ${dominant ?? "sin un patrón claro"}.
Distribución aproximada: ${distTexto || "sin datos suficientes para describir la distribución"}.
`.trim()

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

        const prompt = `
Eres un/a especialista en convivencia escolar y clima de aula que apoya a equipos de dupla psicosocial y convivencia en colegios de Chile.

Con el siguiente resumen de datos de clima de aula de un curso, entrega recomendaciones específicas para la DUPLA y para los DOCENTES del curso.

CONDICIONES:
- No menciones nombres de docentes ni estudiantes; habla siempre del "curso" y del "equipo docente".
- Usa un tono profesional, claro y cercano.
- Usa siempre español de Chile.
- No inventes datos fuera del resumen; si hay pocos registros, recalca esa limitación.

FORMATO DE RESPUESTA (mantén estos subtítulos):
1. Fortalezas del curso
2. Riesgos o alertas a considerar
3. Sugerencias para la dupla psicosocial
4. Recomendaciones prácticas para los docentes del curso

Este es el resumen de datos para este curso:

${resumen}
`.trim()

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://nitiv.app",
                "X-Title": "Nitiv Clima Aula",
            },
            body: JSON.stringify({
                model: "openai/gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "Eres un/a especialista en convivencia escolar y clima de aula que apoya a equipos de dupla psicosocial y convivencia en colegios de Chile.",
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
        console.error("Error en /api/ai/climate-course:", error)
        return NextResponse.json(
            {
                text:
                    "Ocurrió un error inesperado al generar la recomendación. Intenta nuevamente y, si persiste, informa al equipo técnico.",
            },
            { status: 200 }
        )
    }
}

