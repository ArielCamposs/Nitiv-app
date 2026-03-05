"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

export function LoginForm() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient() // ← se crea dentro del handler, no al renderizar
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            toast.error("Credenciales incorrectas o usuario inexistente")
            setLoading(false)
            return
        }

        router.push("/")
    }

    return (
        <main className="min-h-screen grid lg:grid-cols-2 bg-white">
            <div className="hidden lg:flex flex-col items-center justify-center bg-slate-50 p-12 relative overflow-hidden border-r border-slate-300">
                <img
                    src="/LogoNitiv.svg"
                    alt="Nitiv Logo"
                    className="w-[600px] h-auto drop-shadow-md z-10"
                />
            </div>

            {/* Columna del Formulario */}
            <div className="flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white">
                <div className="w-full max-w-sm space-y-8">
                    <div className="flex flex-col items-center lg:hidden mb-8">
                        <img src="/LogoNitiv.svg" alt="Nitiv Logo" className="h-48 w-auto object-contain drop-shadow-sm" />
                    </div>

                    <div className="space-y-6 text-center lg:text-left">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Inicia sesión</h2>
                            <p className="text-sm text-slate-500 font-medium">Ingresa tus credenciales para acceder</p>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">
                                    Correo electrónico
                                </label>
                                <Input
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@correo.com"
                                    required
                                    className="h-11 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-900">
                                        Contraseña
                                    </label>
                                </div>
                                <Input
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="h-11 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all rounded-xl"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] rounded-xl" disabled={loading}>
                            {loading ? "Ingresando..." : "Ingresar"}
                        </Button>
                    </form>
                </div>
            </div>
        </main>
    )
}
