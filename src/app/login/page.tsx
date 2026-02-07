import { login } from './actions'

export default async function LoginPage(props: {
    searchParams: Promise<{ error?: string }>
}) {
    const searchParams = await props.searchParams

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#94A3B8]/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#CCD5AE]/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 z-10 border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#475569] mb-2">Nitiv</h1>
                    <p className="text-gray-500">Bienestar y comunidad escolar</p>
                </div>

                {searchParams?.error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">
                        {searchParams.error}
                    </div>
                )}

                <form className="space-y-6">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Correo Institucional
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#94A3B8] focus:border-transparent outline-none transition-all"
                            placeholder="nombre@colegio.cl"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Contraseña
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#94A3B8] focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        formAction={login}
                        className="w-full bg-[#475569] hover:bg-[#334155] text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-gray-200 flex justify-center items-center gap-2"
                    >
                        Iniciar Sesión
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400">
                    <p>© 2026 Nitiv Platform</p>
                </div>
            </div>
        </div>
    )
}
