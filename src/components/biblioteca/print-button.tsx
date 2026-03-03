"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() {
    return (
        <Button
            onClick={() => {
                if (typeof window !== "undefined") {
                    window.print()
                }
            }}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2"
            size="lg"
        >
            <Printer className="w-5 h-5" />
            Imprimir / Descargar Plantilla
        </Button>
    )
}
