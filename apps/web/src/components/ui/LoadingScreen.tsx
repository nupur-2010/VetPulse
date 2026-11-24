import { CowIcon } from './PastoralScene'

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2]">
      <div className="flex flex-col items-center gap-5 text-center p-6 max-w-sm">
        {/* Modern Medical Pulse Emblem */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 flex items-center justify-center shadow-xl ring-4 ring-emerald-500/20">
            <CowIcon className="w-10 h-10" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white animate-ping" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-emerald-950 tracking-tight">VetPulse</h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">Connecting cattle health intelligence...</p>
        </div>

        {/* Minimalist Progress Line */}
        <div className="w-44 h-1 bg-stone-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-600 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  )
}
