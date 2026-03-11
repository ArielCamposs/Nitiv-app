"use server"

import { revalidatePath } from "next/cache"

/** Invalida la caché de la página Clima de aula para que al hacer refresh se carguen los nuevos registros. */
export async function revalidateClimaPage() {
    revalidatePath("/docente/clima")
}
