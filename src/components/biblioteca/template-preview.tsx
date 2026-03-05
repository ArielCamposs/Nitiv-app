"use client"

import { useState } from "react"
import { Activity, FileImage } from "lucide-react"

type TemplateType = "armadura" | "gafas" | "termometro" | "mapa" | "none"

const TEMPLATE_LABELS: Record<string, string> = {
    armadura: "Armadura de Fortalezas",
    gafas: "Gafas de Perspectivas",
    termometro: "Termómetro de Energía",
    mapa: "Mapa de Identidad",
}

export function TemplatePreview({ type }: { type: string }) {
    const [enlarged, setEnlarged] = useState(false)

    if (type === "none") {
        return (
            <p className="text-sm text-slate-500">
                Esta actividad no requiere material impreso para los estudiantes.
            </p>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileImage className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Plantilla: <span className="font-semibold text-slate-700">{TEMPLATE_LABELS[type] || type}</span></span>
            </div>

            {/* Preview container — click to enlarge */}
            <button
                onClick={() => setEnlarged(true)}
                title="Ver vista previa de la plantilla"
                className="w-full cursor-zoom-in group overflow-hidden rounded-lg border-2 border-slate-200 hover:border-indigo-300 transition-colors bg-white relative"
            >
                <div className="transform scale-[0.4] origin-top-left w-[250%] pointer-events-none">
                    <TemplateSVGRender type={type} />
                </div>
                <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                    <span className="text-xs text-indigo-700 font-semibold bg-white/90 px-2 py-0.5 rounded shadow">
                        Click para ampliar
                    </span>
                </div>
            </button>

            {/* Lightbox */}
            {enlarged && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6 cursor-zoom-out"
                    onClick={() => setEnlarged(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl overflow-auto max-w-3xl max-h-[90vh] w-full p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">
                                Vista previa — {TEMPLATE_LABELS[type] || type}
                            </h2>
                            <button
                                onClick={() => setEnlarged(false)}
                                className="text-slate-400 hover:text-slate-700 text-2xl leading-none font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <TemplateSVGRender type={type} />
                        </div>
                        <p className="text-xs text-slate-400 mt-3 text-center">
                            Esta es la plantilla que se imprimirá para los estudiantes.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function TemplateSVGRender({ type }: { type: string }) {
    if (type === "gafas") {
        return (
            <div className="p-4 space-y-6 bg-white">
                <h3 className="text-center text-xl font-bold text-slate-800">Gafas de Perspectivas</h3>
                <p className="text-center text-sm text-slate-600">Escribe lo que ve y siente cada uno.</p>

                {/* Lentes del alumno - dos grandes círculos con bisagras cuadradas y puente curvo abajo */}
                <div className="space-y-1">
                    <p className="font-semibold text-base text-slate-700 text-center">Lentes del alumno</p>
                    <svg viewBox="0 0 500 200" className="w-full h-auto">
                        {/* Left circle */}
                        <circle cx="155" cy="100" r="85" fill="white" stroke="black" strokeWidth="6" />
                        {/* Right circle */}
                        <circle cx="345" cy="100" r="85" fill="white" stroke="black" strokeWidth="6" />
                        {/* Bridge - small arch between, curving upwards from center-bottom */}
                        <path d="M240 108 Q250 88 260 108" fill="none" stroke="black" strokeWidth="6" strokeLinecap="round" />
                        {/* Left hinge - small square tab */}
                        <rect x="58" y="88" width="14" height="12" rx="1" fill="black" />
                        {/* Right hinge */}
                        <rect x="428" y="88" width="14" height="12" rx="1" fill="black" />
                    </svg>
                    <div className="border-b-2 border-slate-300 mx-8 mt-1" />
                </div>

                {/* Lentes propios - browline/clubmaster: tope sólido negro ancho, lentes redondeados abajo */}
                <div className="space-y-1">
                    <p className="font-semibold text-base text-slate-700 text-center">Lentes propios</p>
                    <svg viewBox="0 0 500 170" className="w-full h-auto">
                        {/* Left lens full shape */}
                        <path
                            d="M30 30 L220 20 L225 80 Q222 145 165 155 Q95 158 72 138 Q40 115 38 75 Z"
                            fill="black" stroke="black" strokeWidth="2"
                        />
                        {/* Left lens white interior (the clear part) */}
                        <path
                            d="M55 68 Q55 40 90 35 L205 30 L210 78 Q208 128 162 136 Q108 138 82 118 Q58 100 55 68 Z"
                            fill="white" stroke="none"
                        />
                        {/* Thin bottom frame of left lens */}
                        <path
                            d="M55 68 Q55 100 82 118 Q108 138 162 136 Q208 128 210 78"
                            fill="none" stroke="black" strokeWidth="5"
                        />

                        {/* Right lens full shape */}
                        <path
                            d="M470 30 L280 20 L275 80 Q278 145 335 155 Q405 158 428 138 Q460 115 462 75 Z"
                            fill="black" stroke="black" strokeWidth="2"
                        />
                        {/* Right lens white interior */}
                        <path
                            d="M445 68 Q445 40 410 35 L295 30 L290 78 Q292 128 338 136 Q392 138 418 118 Q442 100 445 68 Z"
                            fill="white" stroke="none"
                        />
                        {/* Thin bottom frame of right lens */}
                        <path
                            d="M445 68 Q445 100 418 118 Q392 138 338 136 Q292 128 290 78"
                            fill="none" stroke="black" strokeWidth="5"
                        />

                        {/* Bridge joining both - thick solid bar */}
                        <path d="M220 42 Q250 36 280 42 L280 62 Q250 56 220 62 Z" fill="black" />

                        {/* Left temple cutout oval */}
                        <ellipse cx="42" cy="52" rx="10" ry="7" fill="white" />
                        {/* Right temple cutout oval */}
                        <ellipse cx="458" cy="52" rx="10" ry="7" fill="white" />
                    </svg>
                    <div className="border-b-2 border-slate-300 mx-8 mt-1" />
                </div>

                {/* Lentes del profesor - aviator: ancho, plano arriba, redondeado abajo */}
                <div className="space-y-1">
                    <p className="font-semibold text-base text-slate-700 text-center">Lentes del profesor</p>
                    <svg viewBox="0 0 500 175" className="w-full h-auto">
                        {/* Left aviator lens */}
                        <path
                            d="M25 50 Q28 18 120 15 Q185 15 210 40 Q225 58 218 110 Q210 150 155 160 Q75 162 38 130 Q15 105 25 50 Z"
                            fill="white" stroke="black" strokeWidth="6"
                        />
                        {/* Right aviator lens */}
                        <path
                            d="M475 50 Q472 18 380 15 Q315 15 290 40 Q275 58 282 110 Q290 150 345 160 Q425 162 462 130 Q485 105 475 50 Z"
                            fill="white" stroke="black" strokeWidth="6"
                        />
                        {/* Thick horizontal bridge bar */}
                        <rect x="208" y="26" width="84" height="18" rx="4" fill="black" />
                        {/* Top double line across bridge */}
                        <line x1="208" y1="26" x2="292" y2="26" stroke="black" strokeWidth="2" />
                        {/* Left nose pad */}
                        <path d="M224 44 L215 65" stroke="black" strokeWidth="4" strokeLinecap="round" />
                        {/* Right nose pad */}
                        <path d="M276 44 L285 65" stroke="black" strokeWidth="4" strokeLinecap="round" />
                        {/* Arms */}
                        <line x1="25" y1="50" x2="4" y2="58" stroke="black" strokeWidth="5" strokeLinecap="round" />
                        <line x1="475" y1="50" x2="496" y2="58" stroke="black" strokeWidth="5" strokeLinecap="round" />
                    </svg>
                    <div className="border-b-2 border-slate-300 mx-8 mt-1" />
                </div>
            </div>
        )
    }

    if (type === "termometro") {
        return (
            <div className="p-4 flex gap-4 items-stretch min-h-[280px]">
                <div className="w-14 flex justify-center items-center">
                    <svg viewBox="0 0 1000 4000" className="w-12 h-full stroke-slate-900 fill-none" strokeWidth="60">
                        <path d="M 350,500 A 150,150 0 0,1 650,500 L 650,3130 A 400,400 0 1,1 350,3130 Z" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="flex-1 flex flex-col gap-3">
                    {["Zona Roja – Explosión", "Zona Amarilla – Inquietud", "Zona Verde – Tranquilidad"].map((z) => (
                        <div key={z} className="border-2 border-slate-800 rounded-xl flex-1 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-700 text-center px-2">{z}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (type === "mapa") {
        return (
            <div className="p-4">
                <h3 className="text-center text-lg font-bold text-slate-800 mb-2">Mapa de Identidad</h3>
                <svg viewBox="0 0 800 800" className="w-full h-auto stroke-slate-900 fill-none" strokeWidth="3">
                    <path d="M 280 280 L 350 380 M 520 280 L 450 380 M 280 520 L 350 420 M 520 520 L 450 420" />
                    <ellipse cx="400" cy="400" rx="100" ry="35" className="fill-white stroke-slate-900" strokeWidth="3" />
                    {[["200", "200", "Mis Talentos"], ["600", "200", "Mis Valores"], ["200", "600", "Mis Sueños"], ["600", "600", "Mis Miedos"]].map(([cx, cy, label]) => (
                        <g key={label} transform={`translate(${cx}, ${cy})`}>
                            <circle cx="0" cy="0" r="140" className="fill-white stroke-slate-800" strokeDasharray="6 6" strokeWidth="4" />
                            <text x="0" y="-85" textAnchor="middle" className="fill-slate-800 stroke-none" style={{ fontSize: "28px", fontWeight: "600" }}>{label}</text>
                        </g>
                    ))}
                </svg>
            </div>
        )
    }

    if (type === "armadura") {
        return (
            <div className="p-4 flex flex-col items-center gap-3">
                <h3 className="text-center text-base font-bold text-slate-800">Armadura de Fortalezas</h3>
                <p className="text-xs text-slate-500 text-center">Escribe y decora según tus poderes</p>
                <svg viewBox="0 0 500 530" className="w-full h-auto" fill="white" stroke="black" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                    {/* Neck opening */}
                    <ellipse cx="250" cy="118" rx="46" ry="30" fill="black" stroke="black" />
                    {/* Chest plate */}
                    <path d="M172 132 Q205 112 250 110 Q295 112 328 132 L348 352 Q305 385 250 388 Q195 385 152 352 Z" />
                    <line x1="250" y1="110" x2="250" y2="388" strokeWidth="3" />
                    <circle cx="212" cy="208" r="7" fill="black" />
                    <circle cx="288" cy="208" r="7" fill="black" />
                    <circle cx="212" cy="318" r="7" fill="black" />
                    <circle cx="288" cy="318" r="7" fill="black" />
                    {/* Left pauldron */}
                    <ellipse cx="105" cy="196" rx="80" ry="88" />
                    <path d="M44 172 Q78 158 105 157" fill="none" strokeWidth="3" />
                    <path d="M40 204 Q76 190 105 190" fill="none" strokeWidth="3" />
                    <circle cx="115" cy="242" r="7" fill="black" />
                    {/* Right pauldron */}
                    <ellipse cx="395" cy="196" rx="80" ry="88" />
                    <path d="M456 172 Q422 158 395 157" fill="none" strokeWidth="3" />
                    <path d="M460 204 Q424 190 395 190" fill="none" strokeWidth="3" />
                    <circle cx="385" cy="242" r="7" fill="black" />
                    {/* Left arm guards */}
                    <rect x="35" y="282" width="125" height="32" rx="9" />
                    <rect x="42" y="320" width="115" height="30" rx="8" />
                    <rect x="48" y="355" width="105" height="28" rx="7" />
                    {/* Right arm guards */}
                    <rect x="340" y="282" width="125" height="32" rx="9" />
                    <rect x="343" y="320" width="115" height="30" rx="8" />
                    <rect x="347" y="355" width="105" height="28" rx="7" />
                    {/* Tassets */}
                    <path d="M155 382 L155 440 Q180 448 205 440 L208 382 Z" />
                    <rect x="160" y="390" width="18" height="14" rx="2" />
                    <rect x="182" y="390" width="16" height="14" rx="2" />
                    <circle cx="188" cy="426" r="6" fill="black" />
                    <path d="M214 382 L214 445 Q250 452 286 445 L286 382 Z" />
                    <circle cx="250" cy="398" r="7" fill="black" />
                    <circle cx="250" cy="432" r="7" fill="black" />
                    <path d="M292 382 L292 440 Q320 448 345 440 L345 382 Z" />
                    <rect x="322" y="390" width="16" height="14" rx="2" />
                    <rect x="302" y="390" width="18" height="14" rx="2" />
                    <circle cx="312" cy="426" r="6" fill="black" />
                </svg>
            </div>
        )
    }

    return <p className="p-4 text-sm text-slate-400 text-center">Vista previa no disponible</p>
}
