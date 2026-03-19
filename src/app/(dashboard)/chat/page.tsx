import { MessageSquare } from "lucide-react"

export default function ChatIndexPage() {
    return (
        <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 h-full">
            <div className="text-center">
                <div className="p-4 bg-white rounded-full shadow-sm mb-4 inline-flex">
                    <MessageSquare className="w-8 h-8 text-primary/40" />
                </div>
                <h2 className="text-lg font-medium text-slate-800">Tus Mensajes</h2>
                <p className="text-sm mt-1 max-w-xs mx-auto">Selecciona un contacto a la izquierda para iniciar o continuar una conversación.</p>
            </div>
        </div>
    )
}
