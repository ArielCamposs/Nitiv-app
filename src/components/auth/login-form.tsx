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
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
            <Card className="w-full max-w-sm">
                <CardHeader className="flex flex-col items-center gap-2 pb-2">
                    <img src="/logo.svg" alt="Nitiv Logo" className="h-70 w-auto object-contain -mb-8" />
                    <CardTitle className="text-lg font-semibold text-center">
                        Inicia sesión
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Correo electrónico
                            </label>
                            <Input
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Contraseña
                            </label>
                            <Input
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Ingresando..." : "Ingresar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    )
}
