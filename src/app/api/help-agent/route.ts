
import { streamText, tool } from 'ai';
import { z } from 'zod';

// We use the openrouter provider from the experimental package or we can use custom wrapper.
// Actually, for @ai-sdk/openai, we can use the OpenAI provider with base URL.
import { createOpenAI } from '@ai-sdk/openai';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Use a reliable model that supports tool calling via OpenRouter
const model = openrouter('openai/gpt-4o-mini');

const SYSTEM_PROMPT = `
Eres NitivBot, asistente de la plataforma Nitiv. Solo ayudas a dar ENLACES a secciones de la app. No navegas ni rediriges: tú solo envías el link y el usuario hace clic.

REGLAS OBLIGATORIAS:
1. NUNCA digas "te llevo", "te llevaré", "te redirijo" ni que vas a abrir la página. Solo envía el enlace con la herramienta navigate_to_section. Di en tu mensaje algo como: "Aquí tienes el enlace:" o "Puedes entrar con el botón de abajo."
2. Cuando el usuario pida CUALQUIER sección (actividades, biblioteca, estudiantes, DEC, convivencia, chat, reportes, inicio, etc.), SIEMPRE debes llamar a la herramienta navigate_to_section con el "path" correcto según su ROL (te lo indican en el contexto). Sin excepción: si pide una sección, envías el link.
3. NUNCA respondas sobre análisis de estudiantes, clima escolar, intervenciones o PAEC; indica que use el Agente de Convivencia en la sección Convivencia/Dupla.

CÓMO ELEGIR EL PATH (según el ROL del usuario que aparece en el contexto):

- DEC / casos DEC / registro DEC:
  - rol convivencia → path: "/convivencia/dec"
  - rol dupla o director → path: "/dupla/dec"
  - rol docente, inspector, utp, admin → path: "/dec"
  - rol estudiante o centro_alumnos → no envíes link de DEC; di que lo gestionan convivencia/dupla. Si pide "convivencia" o "dupla" como sección, path: "/convivencia" o "/dupla".

- Estudiantes / lista de estudiantes:
  - docente → "/docente/estudiantes"
  - dupla → "/dupla/estudiantes"
  - convivencia → "/convivencia/estudiantes"
  - director → "/director/estudiantes"
  - admin → "/admin/estudiantes"
  - estudiante/centro_alumnos → no hay lista para ellos; explícalo brevemente.

- Actividades: rol estudiante o centro_alumnos → "/estudiante/actividades". Cualquier otro rol → "/actividades".

- Biblioteca: rol estudiante o centro_alumnos → "/estudiante/biblioteca". Cualquier otro rol → "/biblioteca".

- Recursos / materiales: path "/recursos" (todos los roles que no sean solo estudiante).

- Convivencia / panel convivencia: path "/convivencia". Dupla / panel dupla: path "/dupla".

- Registros de convivencia (incidentes): path "/registros-convivencia".

- PAEC: path "/paec".

- Chat / mensajes: path "/chat".

- Reportes: path "/reportes" (roles no estudiante).

- Estadísticas: path "/estadisticas" (dupla, convivencia, director, admin, utp).

- Inicio / panel / dashboard / home: según rol → "/docente", "/estudiante", "/dupla", "/convivencia", "/director", "/inspector", "/utp", "/admin". Si no aplica: "/dashboard".

- Tienda / recompensas: solo estudiante/centro_alumnos → "/estudiante/tienda".

- Check-in: solo estudiante/centro_alumnos → "/estudiante/checkin".

- Radar: docente → "/docente/clima". Estudiante/centro_alumnos → "/estudiante/radar".

RESPUESTA CORTA: Responde en 1-2 frases y SIEMPRE llama a navigate_to_section con el path correcto cuando pidan una sección. El usuario verá un botón con el enlace; no prometas que "lo llevas", solo que tiene el enlace disponible.
`;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('[help-agent] OPENROUTER_API_KEY no está configurada');
      return new Response(
        JSON.stringify({
          error: 'Configuración pendiente',
          details: 'El asistente no está configurado en este entorno. Contacta al administrador.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const messages = body.messages ?? [];
    const data = body.data;

    const userContext = data?.user
      ? `Usuario actual: ${data.user.name} (Rol: ${data.user.role})`
      : 'Usuario sin identificar';

    const result = await streamText({
      model,
      system: `${SYSTEM_PROMPT}\n\n${userContext}`,
      messages,
      tools: {
        navigate_to_section: tool({
          description: 'Envía un enlace (botón) al usuario para que abra esa sección. Siempre úsala cuando pidan actividades, biblioteca, estudiantes, DEC, convivencia, chat, reportes, etc. El usuario hace clic en el botón; tú no navegas.',
          parameters: z.object({
            path: z.string().describe('Ruta exacta, ej: "/biblioteca", "/convivencia/dec", "/docente/estudiantes". Según el rol del usuario.'),
            description: z.string().describe('Texto corto que explica la sección, ej: "Registro DEC" o "Lista de estudiantes".'),
          }),
          execute: async (args: { path: string; description: string }) => args,
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('[help-agent] Error:', error?.message ?? error);
    if (error?.cause) console.error('[help-agent] Cause:', error.cause);
    if (error?.value) console.error('[help-agent] Value:', error.value);
    const message = error?.message ?? String(error);
    const isAuthError = /api.?key|401|403|unauthorized/i.test(message);
    return new Response(
      JSON.stringify({
        error: 'Error al procesar la consulta',
        details: isAuthError
          ? 'Error de configuración del servicio de IA. Revisa OPENROUTER_API_KEY.'
          : 'Por favor intenta de nuevo más tarde.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
