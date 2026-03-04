import { ActivityTemplateType } from "@/lib/data/biblioteca"

export function TemplateViewer({ type, title }: { type: ActivityTemplateType, title: string }) {
    if (type === "none") return null

    return (
        <div className="w-full h-full min-h-screen bg-white text-slate-900 p-8 flex flex-col items-center justify-start print:p-0 print:m-0">
            {/* Header Logos as per mockup */}
            <div className="w-full flex justify-between items-center mb-8 px-4 font-semibold text-lg">
                <div>Logo Nitiv</div>
                <div>Logo Institución</div>
            </div>

            {/* Title & Instructions Area */}
            <div className="w-full max-w-4xl text-center mb-12 space-y-2">
                <h1 className="text-3xl font-bold">
                    {type === "armadura" ? "Actividad: Mi Armadura de Poder" : `Actividad: ${title}`}
                </h1>
                <p className="text-xl text-slate-700">
                    {type === "armadura" && "Escribe y decora según tus poderes"}
                    {type === "gafas" && "Escribe lo que ve y siente cada uno."}
                    {type === "termometro" && "Describe lo que te sucede"}
                    {type === "mapa" && "Puedes escribir o dibujar :)"}
                </p>
            </div>

            {/* Main Template Graphics */}
            <div className="flex-1 w-full max-w-4xl flex items-center justify-center">
                {type === "gafas" && <GafasSVG />}
                {type === "termometro" && <TermometroSVG />}
                {type === "mapa" && <MapaSVG />}
            </div>
        </div>
    )
}


function GafasSVG() {
    return (
        <div className="w-full max-w-2xl flex flex-col gap-4 items-center max-h-[85vh] print:max-h-[26cm]">
            {/* Lentes Alumno */}
            <div className="w-full flex flex-col items-center gap-1">
                <h3 className="text-lg font-semibold mb-1">Lentes del alumno</h3>
                <svg viewBox="0 0 400 150" className="w-[65%] stroke-slate-900 fill-none" strokeWidth="4">
                    {/* Circle Glasses */}
                    <circle cx="120" cy="75" r="60" />
                    <circle cx="280" cy="75" r="60" />
                    {/* Bridge */}
                    <path d="M180 75 Q200 40 220 75" />
                    {/* Temples */}
                    <path d="M60 75 L30 70 M340 75 L370 70" />
                </svg>
                {/* Writing lines inside via absolute positioning or just below */}
                <div className="w-3/4 flex gap-8">
                    <div className="w-1/2 border-b-2 border-slate-300"></div>
                    <div className="w-1/2 border-b-2 border-slate-300"></div>
                </div>
            </div>

            {/* Lentes Propios (Wayfarer style) */}
            <div className="w-full flex flex-col items-center gap-1">
                <h3 className="text-lg font-semibold mb-1">Lentes propios</h3>
                <svg viewBox="0 0 400 150" className="w-[65%] stroke-slate-900 fill-none" strokeWidth="6" strokeLinejoin="round">
                    {/* Wayfarer frames front */}
                    {/* Left Frame */}
                    <path d="M50 40 L160 30 L180 70 C170 140 70 140 50 100 Z" className="fill-slate-900" />
                    <path d="M60 55 L145 45 L155 75 C150 120 80 120 70 95 Z" className="fill-white stroke-none" />

                    {/* Right Frame */}
                    <path d="M350 40 L240 30 L220 70 C230 140 330 140 350 100 Z" className="fill-slate-900" />
                    <path d="M340 55 L255 45 L245 75 C250 120 320 120 330 95 Z" className="fill-white stroke-none" />

                    {/* Bridge */}
                    <path d="M160 30 Q200 25 240 30" className="fill-none stroke-slate-900" strokeWidth="8" />
                    {/* Temples */}
                    <path d="M50 40 L30 40 M350 40 L370 40" strokeWidth="6" />
                </svg>
                <div className="w-3/4 flex gap-8">
                    <div className="w-1/2 border-b-2 border-slate-300"></div>
                    <div className="w-1/2 border-b-2 border-slate-300"></div>
                </div>
            </div>

            {/* Lentes Profesor (Aviator style) */}
            <div className="w-full flex flex-col items-center gap-1">
                <h3 className="text-lg font-semibold mb-1">Lentes del profesor</h3>
                <svg viewBox="0 0 400 150" className="w-[65%] stroke-slate-900 fill-none" strokeWidth="4">
                    {/* Aviator frames */}
                    <path d="M60 40 Q110 30 160 50 Q170 120 110 140 Q50 120 60 40 Z" />
                    <path d="M340 40 Q290 30 240 50 Q230 120 290 140 Q350 120 340 40 Z" />
                    {/* Double Bridge */}
                    <path d="M160 50 L240 50 M140 35 Q200 25 260 35" strokeWidth="3" />
                    {/* Nose pads */}
                    <path d="M170 70 L180 85 M230 70 L220 85" strokeWidth="4" strokeLinecap="round" className="stroke-slate-600" />
                    {/* Temples */}
                    <path d="M60 40 L30 45 M340 40 L370 45" strokeWidth="3" />
                </svg>
                <div className="w-3/4 flex gap-8">
                    <div className="w-1/2 border-b-2 border-slate-300"></div>
                    <div className="w-1/2 border-b-2 border-slate-300"></div>
                </div>
            </div>
        </div>
    )
}

function TermometroSVG() {
    return (
        <div className="w-full h-full flex items-stretch gap-8 mt-4 mb-4 max-h-[85vh] print:max-h-[26cm]">
            {/* Thermometer Graphic */}
            <div className="w-[120px] flex justify-center items-center shrink-0 border-r-2 border-transparent relative">
                <svg viewBox="0 0 1000 4000" className="w-[100px] absolute inset-y-0 h-full stroke-slate-900 print:stroke-black fill-none" strokeWidth="60" style={{ WebkitPrintColorAdjust: "exact", colorAdjust: "exact" }}>
                    {/* The thermometer tube and bulb */}
                    <path d="M 350,500 A 150,150 0 0,1 650,500 L 650,3130 A 400,400 0 1,1 350,3130 Z" strokeLinejoin="round" style={{ stroke: "black" }} />
                </svg>
            </div>

            {/* Zones */}
            <div className="flex-1 flex flex-col justify-between gap-6 py-2">
                {/* Zona Roja */}
                <div className="border-2 border-slate-900 rounded-3xl p-6 flex-1 min-h-[180px] flex justify-center items-start" style={{ WebkitPrintColorAdjust: "exact", colorAdjust: "exact", borderColor: "black" }}>
                    <h3 className="text-center font-bold text-xl text-slate-800 print:text-black mt-4">Zona Roja – Explosión</h3>
                </div>
                {/* Zona Amarilla */}
                <div className="border-2 border-slate-900 rounded-3xl p-6 flex-1 min-h-[180px] flex justify-center items-start" style={{ WebkitPrintColorAdjust: "exact", colorAdjust: "exact", borderColor: "black" }}>
                    <h3 className="text-center font-bold text-xl text-slate-800 print:text-black mt-4">Zona Amarilla – Inquietud</h3>
                </div>
                {/* Zona Verde */}
                <div className="border-2 border-slate-900 rounded-3xl p-6 flex-1 min-h-[180px] flex justify-center items-start" style={{ WebkitPrintColorAdjust: "exact", colorAdjust: "exact", borderColor: "black" }}>
                    <h3 className="text-center font-bold text-xl text-slate-800 print:text-black mt-4">Zona Verde – Tranquilidad</h3>
                </div>
            </div>
        </div>
    )
}

function MapaSVG() {
    return (
        <div className="w-full h-full flex items-center justify-center max-h-[85vh] print:max-h-[26cm] mt-2 mb-2 p-4">
            <svg viewBox="0 0 800 800" className="w-[85%] max-w-2xl stroke-slate-900 fill-none" strokeWidth="3" style={{ WebkitPrintColorAdjust: "exact", colorAdjust: "exact" }}>

                {/* Connecting lines */}
                <path d="M 280 280 L 350 380" className="stroke-slate-900" strokeWidth="3" />
                <path d="M 520 280 L 450 380" className="stroke-slate-900" strokeWidth="3" />
                <path d="M 280 520 L 350 420" className="stroke-slate-900" strokeWidth="3" />
                <path d="M 520 520 L 450 420" className="stroke-slate-900" strokeWidth="3" />

                {/* Central Oval */}
                <ellipse cx="400" cy="400" rx="100" ry="35" className="fill-white stroke-slate-900" strokeWidth="3" />
                {/* Small inner sketched effect for the oval */}
                <ellipse cx="400" cy="400" rx="95" ry="30" className="fill-transparent stroke-slate-500" strokeWidth="1" />

                {/* Top Left Circle: Mis Talentos */}
                <g transform="translate(200, 200)">
                    <circle cx="0" cy="0" r="140" className="fill-white stroke-slate-800" strokeDasharray="6 6" strokeWidth="4" />
                    <circle cx="0" cy="0" r="133" className="fill-transparent stroke-slate-300" strokeWidth="1" />
                    <text x="0" y="-95" textAnchor="middle" className="fill-slate-900 stroke-none font-semibold text-2xl" style={{ fontFamily: "inherit" }}>Mis Talentos</text>
                </g>

                {/* Top Right Circle: Mis Valores */}
                <g transform="translate(600, 200)">
                    <circle cx="0" cy="0" r="140" className="fill-white stroke-slate-800" strokeDasharray="6 6" strokeWidth="4" />
                    <circle cx="0" cy="0" r="133" className="fill-transparent stroke-slate-300" strokeWidth="1" />
                    <text x="0" y="-95" textAnchor="middle" className="fill-slate-900 stroke-none font-semibold text-2xl" style={{ fontFamily: "inherit" }}>Mis Valores</text>
                </g>

                {/* Bottom Left Circle: Mis Sueños */}
                <g transform="translate(200, 600)">
                    <circle cx="0" cy="0" r="140" className="fill-white stroke-slate-800" strokeDasharray="6 6" strokeWidth="4" />
                    <circle cx="0" cy="0" r="133" className="fill-transparent stroke-slate-300" strokeWidth="1" />
                    <text x="0" y="-95" textAnchor="middle" className="fill-slate-900 stroke-none font-semibold text-2xl" style={{ fontFamily: "inherit" }}>Mis Sueños</text>
                </g>

                {/* Bottom Right Circle: Mis Miedos */}
                <g transform="translate(600, 600)">
                    <circle cx="0" cy="0" r="140" className="fill-white stroke-slate-800" strokeDasharray="6 6" strokeWidth="4" />
                    <circle cx="0" cy="0" r="133" className="fill-transparent stroke-slate-300" strokeWidth="1" />
                    <text x="0" y="-95" textAnchor="middle" className="fill-slate-900 stroke-none font-semibold text-2xl" style={{ fontFamily: "inherit" }}>Mis Miedos</text>
                </g>
            </svg>
        </div>
    )
}
