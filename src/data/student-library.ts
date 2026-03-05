export type StudentLibraryItem = {
    id: string
    title: string
    category: string
    description: string
    content: {
        intro: string
        sections: {
            title: string
            items: string[]
        }[]
        warning?: string
        primaryAction?: {
            label: string
            href: string
            icon: "LifeBuoy" | "Phone"
            hideInPdf: boolean
        }
    }
}

export const studentLibraryData: StudentLibraryItem[] = [
    {
        id: "rupturas-amorosas",
        title: "Rupturas amorosas: El vacío después del 'adiós'",
        category: "Educación Emocional",
        description: "¿Terminaste con alguien y sientes un dolor real en el pecho? Conoce por qué pasa y cómo manejarlo.",
        content: {
            intro: "¿Terminaste con alguien y sientes un dolor real en el pecho, como si te faltara algo? El cerebro procesa una ruptura de forma muy intensa. La ruptura es un evento estresante mayor que activa nuestros sistemas de estrés biológico y de duelo. Es normal sentirse muy mal por un tiempo. No significa que estés loco ni que 'seas débil': es una reacción del corazón y del cuerpo a una pérdida importante.",
            sections: [
                {
                    title: "¿Qué puedes sentir?",
                    items: [
                        "Tristeza y ganas de llorar: como cuando se muere alguien querido; es un tipo de duelo amoroso.",
                        "Rabia o ganas de culpar a alguien: a ti mismo, a la otra persona o a terceros.",
                        "Miedo y preocupación: '¿me volverán a querer?', '¿me voy a quedar solo/a?'.",
                        "Pensar todo el rato en la relación: recordar momentos buenos o malos, revisar redes, fotos, etc.",
                        "Cambios en el cuerpo: no poder dormir bien, poco apetito o comer de más, dolores de guata o de cabeza, cansancio.",
                        "Bajón fuerte: pocas ganas de hacer cosas, descuido del estudio, sentirse sin valor."
                    ]
                },
                {
                    title: "¿Por qué pasa esto?",
                    items: [
                        "Porque esa persona era importante para ti: la veías, hablaban, se apoyaban; tu cerebro y tu corazón se acostumbraron a eso.",
                        "Al terminar, se siente como si 'faltara una parte' de tu vida; por eso aparecen tristeza, rabia y miedo."
                    ]
                },
                {
                    title: "¿Qué podría hacer?",
                    items: [
                        "Escribe una carta con todo lo que sientes y no la envíes. El objetivo es sacar la emoción de tu cuerpo, no reabrir la herida.",
                        "Con el tiempo, y si hablas con amigos, familia o algún adulto del colegio, suelen volver la esperanza y las emociones más positivas."
                    ]
                }
            ],
            warning: "⚠️ Si el dolor es muy fuerte, dura mucho, o tienes ideas de hacerte daño, es muy importante pedir ayuda a un adulto de confianza, orientación o un profesional de salud mental."
        }
    },
    {
        id: "autolesiones-cuidado-fisico",
        title: "Autolesiones y el cuidado físico: El dolor que no se ve",
        category: "Cuidado Personal",
        description: "A veces el dolor por dentro es tan fuerte que parece que la única forma de sacarlo es haciéndonos daño por fuera.",
        content: {
            intro: "A veces el dolor por dentro es tan fuerte que parece que la única forma de sacarlo es haciéndonos daño por fuera. Si te ha pasado, no estás solo y no tienes por qué ocultarlo.",
            sections: [
                {
                    title: "¿Qué significa esto?",
                    items: [
                        "Las autolesiones son una forma de Desahogo Extremo.",
                        "Es un intento de tu mente por 'apagar' una angustia que parece insoportable.",
                        "Pero es una solución que duele y que no resuelve la raíz del problema."
                    ]
                },
                {
                    title: "Herramienta de Acción",
                    items: [
                        "Cuando sientas ese impulso, intenta el 'Método del Hielo': aprieta un cubo de hielo en tu mano.",
                        "El frío intenso le da a tu cerebro una sensación fuerte de realidad sin lastimarte.",
                        "Luego, busca a alguien en quien confíes."
                    ]
                }
            ],
            warning: "⚠️ Este es un tema serio que requiere apoyo. Si tienes heridas que no sanan o te sientes en peligro, necesitamos ayudarte hoy mismo. No es un juicio, es cuidado.",
            primaryAction: {
                label: "Botón de Ayuda Inmediata",
                href: "/estudiante/ayuda",
                icon: "LifeBuoy",
                hideInPdf: true
            }
        }
    }
]
