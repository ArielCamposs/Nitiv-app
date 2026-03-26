export type EjeCasel =
    | "Autoconciencia"
    | "Autoregulación"
    | "Habilidades Relacionales"
    | "Conciencia Social"
    | "Toma de decisiones"

export type TipoActividad = "Reflexión" | "Dilema" | "Regulación"

export type Ciclo = "ciclo1" | "ciclo2" | "ciclo3"

export interface ActividadSEL {
    id: string
    numero: number
    nombre: string
    desarrollo: string
    moraleja: string
    consejoGuiado: string
    ejeCasel: EjeCasel
    tipo: TipoActividad
    mes?: string
}

export interface CicloInfo {
    id: Ciclo
    label: string
    descripcion: string
    enfoque: string
    cursos: string
}

export const CICLOS: CicloInfo[] = [
    {
        id: "ciclo1",
        label: "Ciclo 1",
        cursos: "1° a 4° Básico",
        descripcion: "Primer ciclo básico",
        enfoque:
            "Nombrar y reconocer emociones propias · Respuestas simples ante conflictos · Empatía básica · Decisiones con consecuencias visibles e inmediatas. Pensamiento concreto — sin abstracción moral compleja.",
    },
    {
        id: "ciclo2",
        label: "Ciclo 2",
        cursos: "5° a 8° Básico",
        descripcion: "Segundo ciclo básico",
        enfoque:
            "Regulación emocional avanzada · Habilidades de comunicación · Resolución de conflictos · Toma de decisiones responsable.",
    },
    {
        id: "ciclo3",
        label: "Ciclo 3",
        cursos: "1° a 4° Medio",
        descripcion: "Enseñanza media",
        enfoque:
            "Identidad y proyecto de vida · Liderazgo y ciudadanía · Pensamiento crítico y ético · Relaciones saludables y bienestar.",
    },
]

export const ACTIVIDADES_CICLO1: ActividadSEL[] = [
    {
        id: "c1-s1",
        numero: 1,
        nombre: "¿Cómo llego hoy?",
        mes: "Marzo",
        desarrollo:
            "Se visualizan emojis que representen distintas emociones. Cada estudiante señala cuál describe cómo llegó al colegio esta mañana. Se comparte en voz alta voluntariamente.",
        moraleja:
            '"Todas las emociones son válidas. Reconocerlas es el primer paso para cuidarlas."',
        consejoGuiado:
            "Si hay estudiantes que dicen \"mal\" o \"triste\", no los corrijas ni minimices. Diles \"gracias por contarme\" y ofrece el apoyo si es necesario. Es importante entender la validez de emociones placenteras y displacenteras.",
        ejeCasel: "Autoconciencia",
        tipo: "Reflexión",
    },
    {
        id: "c1-s2",
        numero: 2,
        nombre: "Mi color de hoy",
        mes: "Marzo",
        desarrollo:
            "Cada estudiante elige un color que representa cómo se siente y lo dibuja en su cuaderno. El docente pregunta a 3–4 estudiantes por qué eligieron ese color.",
        moraleja:
            '"Nuestras emociones cambian todos los días y eso está bien."',
        consejoGuiado:
            "Aplica los colores mencionados y la emoción escrita para hacer un \"clima del curso\" en la pizarra. Muéstralo: \"¡Miren cuántos colores diferentes tiene nuestro curso hoy!\" Eso valida la diversidad emocional. (en caso de no tener los insumos se recomienda utilizar proyectar Paint).",
        ejeCasel: "Autoregulación",
        tipo: "Reflexión",
    },
    {
        id: "c1-s3",
        numero: 3,
        nombre: "El semáforo por dentro",
        mes: "Marzo",
        desarrollo:
            "Se proyecta un semáforo. Rojo = muy enojado o asustado, amarillo = un poco nervioso, verde = tranquilo. Los estudiantes levantan la mano según su color. El docente pregunta: \"¿Qué cosas te ponen en rojo?\"",
        moraleja:
            '"Saber en qué color estamos nos ayuda a pedir ayuda cuando la necesitamos."',
        consejoGuiado:
            "Si muchos levantan la mano en rojo, pregunta \"¿qué les ayudaría a pasar al amarillo?\" No busques soluciones perfectas — busca que los estudiantes piensen en recursos propios.",
        ejeCasel: "Autoconciencia",
        tipo: "Reflexión",
    },
    {
        id: "c1-s4",
        numero: 4,
        nombre: "¿Qué me gusta de mi colegio?",
        mes: "Abril",
        desarrollo:
            "Los estudiantes completan en su cuaderno: \"Me gusta estar en el colegio cuando ___\". Se comparten 4–5 respuestas en voz alta. El docente las escribe en la pizarra sin editar.",
        moraleja:
            '"El colegio es de todos y todos hacemos que sea mejor o peor para los demás."',
        consejoGuiado:
            "Si aparecen respuestas negativas (\"no me gusta nada\"), no las corrijas. Escríbelas igual. Al final di: \"Ese es exactamente el tipo de honestidad que nos ayuda a mejorar juntos.\"",
        ejeCasel: "Conciencia Social",
        tipo: "Reflexión",
    },
    {
        id: "c1-s5",
        numero: 5,
        nombre: "¿Dónde siento las emociones?",
        mes: "Abril",
        desarrollo:
            "Se proyecta un cuerpo humano simplificado. \"Cuando estás enojado, ¿dónde lo sientes? ¿Y cuando estás contento?\" Los estudiantes dibujan en su cuaderno marcando el cuerpo.",
        moraleja:
            '"Nuestro cuerpo nos habla antes que nuestra mente. Aprender a escucharlo nos ayuda a cuidarnos."',
        consejoGuiado:
            "Normaliza respuestas diversas — no hay ubicación incorrecta. Si un estudiante dice \"en el estómago cuando estoy nervioso\", valídalo: \"es una respuesta fisiológica real.\"",
        ejeCasel: "Autoconciencia",
        tipo: "Reflexión",
    },
    {
        id: "c1-s6",
        numero: 6,
        nombre: "Respiración de globo",
        mes: "Abril",
        desarrollo:
            "El docente proyecta un globo que se infla y desinfla. Los estudiantes lo siguen con su respiración — inhalan 4 segundos, exhalan 4 segundos. 3 repeticiones. Luego preguntas: \"¿Cómo se sienten ahora vs antes?\"",
        moraleja:
            '"Respirar despacio es como un superpoder que todos tenemos — y lo podemos usar en cualquier momento."',
        consejoGuiado:
            "Haz la respiración junto con los estudiantes — no solo instrúyelos. Cuando el docente también participa, la actividad pierde la sensación de \"tarea\" y se vuelve compartida.",
        ejeCasel: "Autoregulación",
        tipo: "Regulación",
    },
    {
        id: "c1-s7",
        numero: 7,
        nombre: "La emoción del personaje",
        mes: "Abril",
        desarrollo:
            "Se proyectan 3 viñetas simples de situaciones cotidianas. \"¿Cómo crees que se siente este personaje?\" Los estudiantes responden en voz alta o en cuaderno.",
        moraleja:
            '"Imaginar cómo se siente otra persona es el primer paso para tratarla bien."',
        consejoGuiado:
            "Pregunta también \"¿alguna vez tú te has sentido así?\" para conectar la empatía con la experiencia propia.",
        ejeCasel: "Conciencia Social",
        tipo: "Reflexión",
    },
    {
        id: "c1-s8",
        numero: 8,
        nombre: "¿Qué harías si ves que alguien llora solo?",
        mes: "Abril",
        desarrollo:
            "Situación proyectada: \"En el recreo ves a un compañero/a llorando solo en un rincón. ¿Qué haces?\" Opciones: A) Me acerco y le pregunto. B) Llamo a la profe. C) Sigo jugando, no es mi problema.",
        moraleja:
            '"Nadie debería estar solo cuando está triste. A veces un pequeño gesto lo cambia todo."',
        consejoGuiado:
            "No presentes la C como \"mala\" de entrada. Pregunta por qué alguien elegiría no involucrarse — puede haber miedo, vergüenza o experiencias propias. Valida eso antes de explorar otras opciones.",
        ejeCasel: "Habilidades Relacionales",
        tipo: "Dilema",
    },
    {
        id: "c1-s9",
        numero: 9,
        nombre: "El monstruo de la rabia",
        mes: "Mayo",
        desarrollo:
            "Los estudiantes dibujan cómo se ve \"su monstruo\" cuando crece. Luego responden: \"¿Qué hace que tu monstruo se achique?\" Se comparten 3–4 estrategias en voz alta.",
        moraleja:
            '"Lo más importante es aprender a escucharla sin dejar que nos controle."',
        consejoGuiado:
            "Termina mencionando los estudiantes. Al final, di: \"Miren — entre todos encontramos muchas formas de cuidarnos.\" Eso construye un recurso colectivo.",
        ejeCasel: "Autoregulación",
        tipo: "Regulación",
    },
    {
        id: "c1-s10",
        numero: 10,
        nombre: "Cuando me enojo, yo...",
        mes: "Mayo",
        desarrollo:
            "Completar la frase: \"Cuando me enojo mucho, lo primero que hago es __\". Se comparten respuestas. El docente clasifica en la pizarra: cosas que ayudan vs cosas que complican.",
        moraleja:
            '"Todos reaccionamos diferente cuando estamos enojados. Conocer nuestra reacción nos ayuda a elegir mejor."',
        consejoGuiado:
            "Si aparecen respuestas como \"golpeo\" o \"grito\", no las juzgues. Clasifícalas sin calificarlas y pregunta \"¿cómo resulta eso después?\" para que sea el propio estudiante quien reflexione.",
        ejeCasel: "Autoregulación",
        tipo: "Reflexión",
    },
    {
        id: "c1-s11",
        numero: 11,
        nombre: "Mi lugar seguro",
        mes: "Mayo",
        desarrollo:
            "Los estudiantes cierran los ojos y el docente los guía: \"Imagina un lugar donde te sientes completamente tranquilo. ¿Cómo es ese lugar? ¿Qué ves, qué escuchas?\" Luego lo dibujan.",
        moraleja:
            '"Todos podemos crear un lugar seguro en nuestra mente al que ir cuando algo nos angustia."',
        consejoGuiado:
            "Esta actividad puede ser intensa para estudiantes que no tienen un lugar que les haga sentir seguros. Si un estudiante dice \"no tengo ninguno\", recíbelo con calma: \"Hoy empezamos a crearlo.\"",
        ejeCasel: "Autoregulación",
        tipo: "Regulación",
    },
    {
        id: "c1-s12",
        numero: 12,
        nombre: "Mi amigo/a rompió algo y quiere que yo diga que fui yo",
        mes: "Mayo",
        desarrollo:
            "Situación: \"Tu mejor amigo rompió sin querer algo de la sala y te pide que digas que fuiste tú. ¿Qué haces?\" Los estudiantes votan y explican su elección.",
        moraleja:
            '"Los verdaderos amigos no nos piden que hagamos cosas que no están bien. La honestidad cuida la amistad."',
        consejoGuiado:
            "Explora con el curso: \"¿Seguiría siendo tu amigo si te culpas de algo que no hizo?\" La lealtad y la honestidad no siempre se oponen — ayúdalos a ver que decir la verdad puede proteger la amistad a largo plazo.",
        ejeCasel: "Toma de decisiones",
        tipo: "Dilema",
    },
    {
        id: "c1-s13",
        numero: 13,
        nombre: "¿Todos somos iguales?",
        mes: "Junio",
        desarrollo:
            "Pregunta proyectada: \"¿En qué somos iguales todos en este curso? ¿En qué somos diferentes?\" Los estudiantes responden en parejas y luego comparten. El docente anota en la pizarra.",
        moraleja:
            '"Ser diferentes no significa que unos sean mejores que otros. La diversidad nos hace más fuertes como grupo."',
        consejoGuiado:
            "Destaca con entusiasmo las diferencias positivas que aparezcan. Si aparece algo delicado (diferencias físicas, económicas), recíbelo con naturalidad: \"Eso también existe y está bien que lo nombremos.\"",
        ejeCasel: "Conciencia Social",
        tipo: "Reflexión",
    },
    {
        id: "c1-s14",
        numero: 14,
        nombre: "¿Cómo ayudo a alguien que está triste?",
        mes: "Junio",
        desarrollo:
            "Los estudiantes responden en cuaderno: \"Cuando un amigo está triste, yo puedo ___\". Se comparten respuestas y se hace una lista colectiva de \"lo que podemos hacer por los demás.\"",
        moraleja:
            '"Ayudar a alguien no siempre significa resolver su problema — a veces es solo estar ahí."',
        consejoGuiado:
            "La lista que construyen juntos puede quedar pegada en el cuaderno o en la sala como recordatorio. Es un recurso que los estudiantes crearon — eso tiene más valor que uno que les entregaste.",
        ejeCasel: "Habilidades Relacionales",
        tipo: "Reflexión",
    },
    {
        id: "c1-s15",
        numero: 15,
        nombre: "Se ríen de mi compañero/a",
        mes: "Junio",
        desarrollo:
            "Situación proyectada: \"En el recreo un grupo de niños se burla de un compañero. Tú estás viendo. ¿Qué haces?\" Opciones proyectadas. Votación y conversación.",
        moraleja:
            '"El silencio ante una injusticia también es una forma de participar en ella."',
        consejoGuiado:
            "Pregunta: \"¿Por qué a veces es difícil defender a alguien?\" Valida el miedo — es real. Luego explora: \"¿Qué podrías hacer que no se enfrentara directamente?\" (buscar a un adulto, acompañar después). Hay muchas formas de ayudar.",
        ejeCasel: "Habilidades Relacionales",
        tipo: "Dilema",
    },
    {
        id: "c1-s16",
        numero: 16,
        nombre: "¿Qué significa ser un buen amigo/a?",
        mes: "Junio",
        desarrollo:
            "Completar en cuaderno: \"Un buen amigo/a es alguien que ___\". Se comparten y el docente hace una nube de palabras en la pizarra.",
        moraleja:
            '"La amistad no se mide por cuánto tiempo llevan juntos sino por cómo se tratan."',
        consejoGuiado:
            "Al final pregunta: \"¿Tú eres ese tipo de amigo/a para alguien?\" La reflexión sobre la reciprocidad es más poderosa que hablar solo de lo que los demás deben dar.",
        ejeCasel: "Habilidades Relacionales",
        tipo: "Reflexión",
    },
    {
        id: "c1-s17",
        numero: 17,
        nombre: "¿Cómo pido ayuda cuando la necesito?",
        mes: "Julio",
        desarrollo:
            "Pregunta: \"¿Cuándo fue la última vez que pediste ayuda? ¿A quién? ¿Fue fácil o difícil?\" Los estudiantes responden en cuaderno.",
        moraleja:
            '"Pedir ayuda no es señal de debilidad — es señal de que confías en alguien."',
        consejoGuiado:
            "Comparte brevemente un momento (genérico, no personal íntimo) en que tú como adulto tuviste que pedir ayuda. Eso normaliza la vulnerabilidad.",
        ejeCasel: "Habilidades Relacionales",
        tipo: "Reflexión",
    },
    {
        id: "c1-s18",
        numero: 18,
        nombre: "Lo mejor del primer semestre",
        mes: "Julio",
        desarrollo:
            "Actividad de cierre: \"¿Qué fue lo mejor que viviste en el colegio este semestre? ¿Qué fue lo más difícil?\" Los estudiantes responden y se comparte en círculo.",
        moraleja:
            '"Mirar hacia atrás para ver cuánto crecemos es tan importante como mirar hacia adelante."',
        consejoGuiado:
            "Termina diciendo algo específico y genuino sobre el curso: \"Este semestre los vi____\". No tiene que ser perfecto — tiene que ser real. Los estudiantes recuerdan cuando los adultos los ven.",
        ejeCasel: "Autoconciencia",
        tipo: "Reflexión",
    },
    {
        id: "c1-s19",
        numero: 19,
        nombre: "¿Cómo digo lo que siento sin hacer daño?",
        mes: "Agosto",
        desarrollo:
            "Se proyectan dos formas de decir lo mismo: \"Eres un pesado\" vs \"Me molesta cuando haces eso\". Los estudiantes practican reescribir frases en su cuaderno.",
        moraleja:
            '"Las palabras que elegimos construyen o destruyen — siempre tenemos esa elección."',
        consejoGuiado:
            "Introduce el concepto de \"mensaje yo\" de forma simple: \"En lugar de decir \'tú haces X\', prueba \'yo siento Y cuando pasa X\'.\". Practiquen una vez con algo real del curso.",
        ejeCasel: "Habilidades Relacionales",
        tipo: "Reflexión",
    },
    {
        id: "c1-s20",
        numero: 20,
        nombre: "Y si alguien no me quiere jugar conmigo",
        mes: "Agosto",
        desarrollo:
            "Situación: \"Quieres jugar con un grupo y te dicen que no. ¿Cómo te sientes? ¿Qué haces?\" Votación y conversación.",
        moraleja:
            '"El rechazo duele, pero no define quienes somos. Siempre hay otras personas y otras posibilidades."',
        consejoGuiado:
            "Valida el dolor del rechazo antes de pasar a soluciones. Decir \"eso duele\" antes que \"pero hay otras opciones\" cambia completamente cómo los estudiantes reciben el consejo.",
        ejeCasel: "Autoregulación",
        tipo: "Dilema",
    },
    {
        id: "c1-s21",
        numero: 21,
        nombre: "El cuento de mis manos",
        mes: "Agosto",
        desarrollo:
            "Los estudiantes trazan su mano en el cuaderno. En cada dedo escriben o dibujan: algo que les calma, alguien de confianza, un lugar seguro, algo que les alegra, algo que son buenos.",
        moraleja:
            '"Siempre tenemos más recursos de los que creemos — a veces solo necesitamos recordarlos."',
        consejoGuiado:
            "Esta actividad puede quedarse en el cuaderno como una herramienta a la que volver. Diles: \"La próxima vez que se sientan mal, miren su mano.\"",
        ejeCasel: "Autoregulación",
        tipo: "Reflexión",
    },
    {
        id: "c1-s22",
        numero: 22,
        nombre: "¿Qué hace que nuestro curso sea especial?",
        mes: "Agosto",
        desarrollo:
            "Lluvia de ideas: \"¿Qué tiene nuestro curso que lo hace único?\" Se construye entre todos una lista en la pizarra.",
        moraleja:
            '"Pertenecer a un grupo que valemos es una fuerza para enfrentar los momentos difíciles."',
        consejoGuiado:
            "Deja la lista en la pizarra o la pide que la registren. El sentido de pertenencia se construye con actos pequeños y repetidos — este es uno de ellos.",
        ejeCasel: "Conciencia Social",
        tipo: "Reflexión",
    },
    {
        id: "c1-s23",
        numero: 23,
        nombre: "¿Hago si veo algo injusto?",
        mes: "Septiembre",
        desarrollo:
            "Situación proyectada: un compañero recibe un trato injusto de otro. Opciones de respuesta. El curso vota y argumenta.",
        moraleja:
            '"Actuar cuando algo no está bien, aunque sea pequeño, es una de las cosas más valientes que podemos hacer."',
        consejoGuiado:
            "Pregunta: \"¿Qué necesitarías para animarte a actuar?\" Puede ser compañía, un adulto, pedir permiso. Explorar los obstáculos es más útil que simplemente decirles que deben actuar.",
        ejeCasel: "Toma de decisiones",
        tipo: "Dilema",
    },
    {
        id: "c1-s24",
        numero: 24,
        nombre: "Mis decisiones del día",
        mes: "Septiembre",
        desarrollo:
            "\"¿Cuántas decisiones tomaste hoy antes de llegar al colegio?\" Los estudiantes hacen una lista. El docente ordena y pregunta: \"¿Cuáles fueron fáciles? ¿Cuáles difíciles?\"",
        moraleja:
            '"Decir bien no significa no equivocarse nunca — significa pensar antes de actuar."',
        consejoGuiado:
            "Ayúdalos a ver que ya son buenos tomando decisiones — solo que no siempre lo notan. Señala la competencia que ya tienen porque aumenta la confianza para enfrentar las más difíciles.",
        ejeCasel: "Toma de decisiones",
        tipo: "Reflexión",
    },
    {
        id: "c1-s25",
        numero: 25,
        nombre: "¿Cómo me tratan y cómo trato yo?",
        mes: "Septiembre",
        desarrollo:
            "\"¿Hay algo que te digan o hagan que te trate bien? ¿Y algo que te moleste?\" Los estudiantes responden en cuaderno de forma privada.",
        moraleja:
            '"Lo que nos afecta a nosotros también puede afectar a los demás — el trato bien empieza por recordar cómo queremos ser tratados."',
        consejoGuiado:
            "No pidas que compartan si no quieren — esta actividad puede tocar temas sensibles. Lo importante es que cada estudiante lo piense para sí mismo.",
        ejeCasel: "Autoconciencia",
        tipo: "Reflexión",
    },
    {
        id: "c1-s26",
        numero: 26,
        nombre: "El nuevo compañero que nadie conoce",
        mes: "Octubre",
        desarrollo:
            "Situación: \"Llega un estudiante nuevo al curso y nadie lo incluye en el recreo. ¿Qué haces?\" Opciones. Votación y conversación.",
        moraleja:
            '"Todos fuimos nuevos alguna vez. Un gesto pequeño, como alguien vive su primer día."',
        consejoGuiado:
            "Si ha habido estudiantes nuevos en el curso, este es el momento ideal para que quien vivió eso comparta cómo se sintió — si quiere y si es apropiado.",
        ejeCasel: "Conciencia Social",
        tipo: "Dilema",
    },
    {
        id: "c1-s27",
        numero: 27,
        nombre: "Cuando me equivoco",
        mes: "Octubre",
        desarrollo:
            "\"¿Qué pasa cuando te equivocas? ¿Cómo te sientes?\" Los estudiantes responden y se exploran formas de reparar errores.",
        moraleja:
            '"Equivocarse no es lo mismo que ser malo — lo que importa es qué haces después."',
        consejoGuiado:
            "Introduce el concepto de reparación: \"Pedir disculpas es bueno, pero reparar el daño es mejor. ¿Qué diferencia hay? Ayúdalos a pensar en acciones concretas, no solo en palabras.",
        ejeCasel: "Toma de decisiones",
        tipo: "Reflexión",
    },
    {
        id: "c1-s28",
        numero: 28,
        nombre: "Mi superpoder secreto",
        mes: "Octubre",
        desarrollo:
            "\"¿En qué eres bueno/a que quizás no todo el mundo sabe?\" Los estudiantes responden en cuaderno. Quienes quieran comparten.",
        moraleja:
            '"Todos tenemos algo valioso que aportar — a veces solo necesitamos el espacio para decirlo y que alguien nos escuche."',
        consejoGuiado:
            "Si alguien dice \"no soy bueno en nada\", no lo dejes pasar solo. Pregunta al curso: \"¿Alguien conoce algo en lo que [nombre] sea bueno?\" Este es uno de los momentos más poderosos del año.",
        ejeCasel: "Autoconciencia",
        tipo: "Reflexión",
    },
    {
        id: "c1-s29",
        numero: 29,
        nombre: "¿Quién soy yo este año?",
        mes: "Noviembre",
        desarrollo:
            "Los estudiantes dibujan un retrato de sí mismos con 3 palabras que los describan. Se comparten en grupos pequeños.",
        moraleja:
            '"Conocerse es un trabajo de toda la vida — cada año nos volvemos un poco más claro."',
        consejoGuiado:
            "Cierra el año preguntando: \"¿Cuál de estas palabras no hubieras dicho hace un año? Eso que ves visible es el crecimiento.\"",
        ejeCasel: "Autoconciencia",
        tipo: "Reflexión",
    },
]

export const EJES_CASEL: EjeCasel[] = [
    "Autoconciencia",
    "Autoregulación",
    "Habilidades Relacionales",
    "Conciencia Social",
    "Toma de decisiones",
]

export const COLORES_CASEL: Record<EjeCasel, { bg: string; text: string; border: string; dot: string }> = {
    Autoconciencia: {
        bg: "bg-violet-50",
        text: "text-violet-700",
        border: "border-violet-200",
        dot: "bg-violet-500",
    },
    Autoregulación: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
    },
    "Habilidades Relacionales": {
        bg: "bg-pink-50",
        text: "text-pink-700",
        border: "border-pink-200",
        dot: "bg-pink-500",
    },
    "Conciencia Social": {
        bg: "bg-teal-50",
        text: "text-teal-700",
        border: "border-teal-200",
        dot: "bg-teal-500",
    },
    "Toma de decisiones": {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500",
    },
}

export const COLORES_TIPO: Record<TipoActividad, { bg: string; text: string }> = {
    Reflexión: { bg: "bg-emerald-100", text: "text-emerald-700" },
    Dilema: { bg: "bg-orange-100", text: "text-orange-700" },
    Regulación: { bg: "bg-sky-100", text: "text-sky-700" },
}
