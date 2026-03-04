import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// We will read the static activities directly from the file to avoid dealing with next.js compilation in a raw TS script
const activities = [
    {
        title: "El Arte de Decir No (Asertividad)",
        eje: "Habilidades de Relación (Comunicación asertiva y límites)",
        objective: "Aprender a establecer límites personales frente a la presión del grupo sin usar la agresividad.",
        duration_info: "40 min",
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
        title: "Mis Fortalezas en Acción",
        eje: "Autoconciencia (Reconocer fortalezas y límites)",
        objective: "Conectar éxitos pasados con la capacidad de enfrentar desafíos presentes (Autoeficacia).",
        duration_info: "40 min",
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
        title: "Lentes de Perspectivas",
        eje: "Conciencia Social (Empatía y toma de perspectiva)",
        objective: "Comprender que un mismo hecho puede ser vivido de formas distintas por diferentes personas, reduciendo los juicios apresurados.",
        duration_info: "40 min",
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
                text: "\"Nadie tiene la verdad absoluta. Antes de juzgar, ponte los lentes del otro\"."
            },
            ticketSalida: "Ingresa a la app para valorar la sesión de hoy."
        },
        template: "gafas"
    },
    {
        title: "El Termómetro de mi Energía",
        eje: "Autoconciencia (Reconocimiento Emocional)",
        objective: "Ayudar a los estudiantes a identificar su nivel de energía y emociones, y conectarlo con estrategias para regularse.",
        duration_info: "45 min",
        content: {
            rompehielo: {
                time: "5 min",
                text: "\"El Clima del Aula\". Todos cierran los ojos. El docente pide que si sienten mucha energía, levanten ambas manos; si sienten energía intermedia, brazos cruzados; si están muy cansados/desmotivados, manos en el escritorio. Al abrir los ojos ven el \"clima\" general."
            },
            desarrollo: {
                time: "30 min",
                intro: "Usaremos la plantilla \"El Termómetro de mi Energía\".",
                steps: [
                    "Cada alumno colorea el nivel del termómetro que mejor representa cómo se siente HOY (Rojo=Alta energía/Ira, Amarillo=Nervioso/Ansioso, Verde=Calmado/Listo para aprender, Azul=Cansado/Triste).",
                    "En la cajita de al lado, deben escribir una palabra que describa esa emoción.",
                    "Abajo, en la zona de \"¿Qué hago con esto?\", escriben 2 estrategias personales. Por ejemplo, si están en azul: \"Escuchar música suave\" o \"hablar con un amigo\". Si están en rojo: \"Respirar profundo\" o \"salir a caminar 2 minutos\"."
                ]
            },
            cierre: {
                time: "10 min",
                text: "\"Conocer nuestra energía es el primer paso para no dejar que nos controle. Cada uno tiene su propio manual de instrucciones que acaba de empezar a escribir hoy.\""
            },
            ticketSalida: "Por favor, ingresa a la app para darnos tu valoración sobre esta actividad."
        },
        template: "termometro"
    },
    {
        title: "Mi Mapa de Identidad",
        eje: "Autoconciencia y Valoración Personal",
        objective: "Reconocer los distintos aspectos que componen la identidad de cada estudiante y fomentar el respeto por la diversidad dentro del aula.",
        duration_info: "45 min",
        content: {
            rompehielo: {
                time: "5 min",
                text: "\"El ovillo de lana\". Se lanza un ovillo a un estudiante que comparte algo que le gusta, luego lanza a otro. Al final se forma una red. Reflexión: Todos somos distintos pero formamos una sola red."
            },
            desarrollo: {
                time: "30 min",
                intro: "Imprime la plantilla del 'Mapa de Identidad' para cada estudiante.",
                steps: [
                    "Pide a los estudiantes que llenen las 4 zonas del mapa de identidad:\n1. Mis Raíces (De dónde vengo, mi familia, mi cultura).\n2. Mis Intereses (Pasatiempos, música, deportes).\n3. Mis Sueños (Qué me gustaría hacer de grande, a dónde viajar, qué aprender).\n4. Lo que me hace Único (Cualidad personal, talento oculto, rasgo físico que me gusta).",
                    "Forma parejas o tríos y pídeles que compartan uno de sus cuadrantes con sus compañeros.",
                    "Pide voluntarios para que compartan algo sorprendente que descubrieron sobre un compañero."
                ]
            },
            cierre: {
                time: "10 min",
                text: "\"Cada uno de nosotros es un mapa de experiencias e historias distintas. Esa diversidad es lo que nos hace un curso más rico y entretenido. ¿Qué aprendiste de alguien que no sabías antes?\""
            },
            ticketSalida: "Para finalizar, entra en la aplicación y responde la pregunta de valoración de esta actividad."
        },
        template: "mapa"
    }
]

async function seed() {
    console.log("Reading environment variables...")
    const envPath = path.resolve(process.cwd(), '.env.local')
    const envFile = fs.readFileSync(envPath, 'utf8')
    const env = Object.fromEntries(
        envFile.split('\n')
            .filter(line => line.includes('='))
            .map(line => {
                const parts = line.split('=')
                const key = parts.shift()?.trim()
                const val = parts.join('=').trim().replace(/^"|"$/g, '')
                return [key, val]
            })
    )

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials in .env.local")
        process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // First find any institution to attach these to
    console.log("Fetching first available institution ID...")
    const { data: instData, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .limit(1)
        .single()

    if (instError || !instData) {
        console.error("Failed to find institution:", instError)
        process.exit(1)
    }

    const institutionId = instData.id
    console.log(`Using Institution ID: ${institutionId}`)

    // Loop through and insert
    console.log(`Seeding ${activities.length} activities...`)

    for (const activity of activities) {
        // Check if exists first by title (avoid duplicates)
        const { data: existing } = await supabase
            .from('biblioteca_activities')
            .select('id')
            .eq('title', activity.title)
            .eq('institution_id', institutionId)
            .single()

        if (existing) {
            console.log(`Activity already exists: ${activity.title}`)
            continue
        }

        const { error } = await supabase
            .from('biblioteca_activities')
            .insert({
                institution_id: institutionId,
                title: activity.title,
                eje: activity.eje,
                objective: activity.objective,
                duration_info: activity.duration_info,
                content: activity.content,
                template: activity.template
                // We leave created_by as NULL since it's a static seed
            })

        if (error) {
            console.error(`Error inserting ${activity.title}:`, error)
        } else {
            console.log(`✓ Inserted: ${activity.title}`)
        }
    }

    console.log("Seeding complete!")
}

seed().catch(console.error)
