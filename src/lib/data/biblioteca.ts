export type ActivityTemplateType = "armadura" | "gafas" | "termometro" | "none"

export interface BibliotecaActivity {
    id: string
    title: string
    eje: string
    objective: string
    durationInfo: string // e.g. "40 min"
    content: {
        rompehielo: { time: string; text: string }
        desarrollo: {
            time: string
            intro: string
            steps: string[]
        }
        cierre: { time: string; text: string }
        ticketSalida: string
    }
    template: ActivityTemplateType
    color: string
}

export const bibliotecaActivities: BibliotecaActivity[] = [
    {
        id: "arte-decir-no",
        title: "El Arte de Decir No (Asertividad)",
        eje: "Habilidades de Relación (Comunicación asertiva y límites)",
        objective: "Aprender a establecer límites personales frente a la presión del grupo sin usar la agresividad.",
        durationInfo: "40 min",
        color: "bg-rose-500", // Representative color for relation/assertiveness
        content: {
            rompehielo: {
                time: "5 min",
                text: "\"El Director de Orquesta\". Un alumno hace movimientos y el resto lo imita. Luego, el docente le pide a uno que deje de imitar y proponga su propio movimiento. Pregunta: \"¿Fue difícil dejar de seguir al grupo?\"."
            },
            desarrollo: {
                time: "25 min",
                intro: "Realizaremos un ejercicio de expresión y asertividad.",
                steps: [
                    "Los alumnos deben identificar 3 situaciones donde decir \"No\" sea saludable (Ej: \"No quiero prestar mi tarea para que la copien\", \"No quiero participar de una broma pesada\").",
                    "Practicarán las siguientes \"Frases Poderosas\":\n- \"Entiendo lo que quieres, pero yo prefiero...\"\n- \"No me siento cómodo haciendo eso porque...\"\n- \"Te aprecio, pero en esto no te voy a seguir\"."
                ]
            },
            cierre: {
                time: "10 min",
                text: "\"Decir NO a algo que no queremos es decirse SÍ a uno mismo. ¿Cuál de estas frases usarías tú?\"."
            },
            ticketSalida: "Escanea el QR y cuéntanos: ¿Te sientes más seguro para poner límites después de esta actividad?"
        },
        template: "none"
    },
    {
        id: "fortalezas-en-accion",
        title: "Mis Fortalezas en Acción",
        eje: "Autoconciencia (Reconocer fortalezas y límites)",
        objective: "Conectar éxitos pasados con la capacidad de enfrentar desafíos presentes (Autoeficacia).",
        durationInfo: "40 min",
        color: "bg-amber-500", // Color for self-awareness / self-efficacy
        content: {
            rompehielo: {
                time: "5 min",
                text: "\"Chócala\". Pide a los alumnos que se levanten y le den un \"chócala\" (high-five) o un saludo particular entre ellos, contándoles una cosa pequeña que lograron hacer bien esta semana (ej: terminar una tarea difícil)."
            },
            desarrollo: {
                time: "25 min",
                intro: "La plantilla se llama \"Mi Armadura de Poder\".",
                steps: [
                    "Deben recordar una situación de años pasados que fue muy difícil para ellos.",
                    "En el escudo deben identificar:\n   i. El Desafío: (Qué pasó).\n   ii. Mi Superpoder: (Qué cualidad usé: paciencia, valentía, humor, esfuerzo).\n   iii. El Resultado: (Cómo me sentí después).",
                    "Decoran la armadura con el \"poder\" escrito asociado a un color."
                ]
            },
            cierre: {
                time: "10 min",
                text: "Concluyes con reflexión general – \"Ese superpoder no se fue, vive en ti. ¿En qué asignatura o situación de esta semana podrías usarlo?\"."
            },
            ticketSalida: "Los estudiantes deben ingresar a la plataforma para evaluar los aspectos socioemocionales de la actividad."
        },
        template: "armadura"
    },
    {
        id: "lentes-perspectivas",
        title: "Lentes de Perspectivas",
        eje: "Conciencia Social (Empatía y toma de perspectiva)",
        objective: "Comprender que un mismo hecho puede ser vivido de formas distintas por diferentes personas, reduciendo los juicios apresurados.",
        durationInfo: "40 min",
        color: "bg-emerald-500", // Empathy / Social Awareness
        content: {
            rompehielo: {
                time: "5 min",
                text: "\"¿Qué ves tú?\". Proyecta una imagen de ilusión óptica (como la del pato/conejo o la joven/anciana). Pregunta: \"Si yo veo un pato y tú un conejo, ¿quién está mintiendo?\". Concluye que la realidad depende de la perspectiva."
            },
            desarrollo: {
                time: "25 min",
                intro: "La plantilla muestra una ilustración de 3 pares de lentes distintos.",
                steps: [
                    "Se plantea un caso breve: \"Un alumno nuevo se sienta solo en el recreo y no habla con nadie\" o \"un alumno se sienta solo la mayoría de las veces en los recreos y no habla con nadie, ni nadie habla con él\".",
                    "Los estudiantes deben escribir qué ve y siente cada uno:\n   i. Gafas del Alumno Nuevo: (Ej: Tengo miedo, no conozco a nadie).\n   ii. Gafas Propias: (Ej: Quizás es pesado o prefiere estar solo).\n   iii. Gafas del Profesor: (Ej: Me preocupa que no se integre).",
                    "Reflexión: ¿Cómo cambiaría la situación si todos usaran las \"Gafas de la Empatía\"?"
                ]
            },
            cierre: {
                time: "10 min",
                text: "\"¿Hubo alguna vez que te enojaste con alguien y después te diste cuenta de que tenías una perspectiva equivocada?\"."
            },
            ticketSalida: "Los estudiantes deben ingresar a la plataforma para evaluar los aspectos socioemocionales de la actividad."
        },
        template: "gafas"
    },
    {
        id: "termometro-energia",
        title: "El Termómetro de mi Energía",
        eje: "Autorregulación (Identificación de estados y control de impulsos)",
        objective: "Identificar las señales corporales del estrés para prevenir desregulaciones.",
        durationInfo: "40 min",
        color: "bg-blue-500", // Self-regulation color mapping
        content: {
            rompehielo: {
                time: "5 min",
                text: "\"Haz lo contrario\". Pide a tus estudiantes que hagan lo contrario a lo que dices tú, si dices \"siéntense\", deben pararse, si dices \"hablen\", deben quedarse en silencio."
            },
            desarrollo: {
                time: "25 min",
                intro: "La plantilla tiene un dibujo de un Termómetro dividido en tres zonas:",
                steps: [
                    "Zona Verde (Regulado): ¿Cómo se siente mi cuerpo cuando estoy tranquilo? (Ej: respiración lenta).",
                    "Zona Amarilla (Inquieto): ¿Qué señales me da mi cuerpo antes de enojarme? (Ej: manos sudadas, calor en la cara).",
                    "Zona Roja (Explosivo): ¿Qué acciones cometo cuando pierdo el control?",
                    "Abajo del termómetro hay una imagen de \"Mi Botiquín de Calma\". Deben escribir 3 acciones para bajar de Rojo a Verde (Ej: respirar 4 veces, pedir un minuto fuera, apretar una pelota), deben evaluar esto según las necesidades de cada persona y emoción. ¿Qué cosas probablemente deberían tener en el aula para lograr autorregularse?"
                ]
            },
            cierre: {
                time: "10 min",
                text: "Plantea esta pregunta – Si notas que tu compañero está en la 'Zona Amarilla', ¿qué podrías hacer tú para ayudarlo sin molestarlo?."
            },
            ticketSalida: "Los estudiantes deben ingresar a la plataforma para evaluar los aspectos socioemocionales de la actividad."
        },
        template: "termometro"
    }
]
