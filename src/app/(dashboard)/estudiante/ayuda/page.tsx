import { createClient } from "@/lib/supabase/server"
import { HelpButton } from "@/components/help/HelpButton"
import { redirect } from "next/navigation"

export default async function AyudaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: student } = await supabase
        .from("students")
        .select("id, institution_id, name")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) redirect("/estudiante")

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-md px-4 py-12 space-y-8">
                <div className="text-center space-y-2">
                    <div className="text-5xl">🤝</div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        ¿Necesitas ayuda?
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Aquí puedes contactar directamente a la dupla psicosocial.
                        Tu mensaje es <strong>completamente confidencial</strong>.
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <p className="text-sm text-slate-600">
                        Si estás pasando por un momento difícil, si sientes que algo no está bien
                        o simplemente necesitas hablar con alguien, no tienes que enfrentarlo solo/a.
                    </p>
                    <HelpButton
                        studentId={student.id}
                        institutionId={student.institution_id}
                    />
                </div>

                <p className="text-center text-xs text-slate-400">
                    Hola, {student.name}. Estamos aquí para apoyarte 💙
                </p>
            </div>
        </main>
    )
}
