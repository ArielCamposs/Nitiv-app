"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    const router = useRouter()

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="text-center space-y-6 max-w-md">
                {/* Icono */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-slate-100 p-6">
                        <FileQuestion className="w-12 h-12 text-slate-400" />
                    </div>
                </div>

                {/* Texto */}
                <div className="space-y-2">
                    <h1 className="text-6xl font-bold text-slate-200">404</h1>
                    <h2 className="text-xl font-semibold text-slate-800">
                        Página no encontrada
                    </h2>
                    <p className="text-sm text-slate-500">
                        La página que buscas no existe o fue movida.
                    </p>
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild>
                        <Link href="/">Ir al inicio</Link>
                    </Button>
                    <Button variant="outline" onClick={() => router.back()}>
                        Volver atrás
                    </Button>
                </div>
            </div>
        </main>
    )
}
