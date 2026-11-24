/**
 * Professional Veterinary & Cattle Visual Assets
 * Modern, realistic, and authentic to veterinary cattle healthcare.
 */

/**
 * Modern Veterinary Pulse & Cattle Emblem Logo
 */
export function CowIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="100%" stopColor="#052e16" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#shieldGrad)" />
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="13.25" stroke="#4ade80" strokeOpacity="0.3" strokeWidth="1.5" />
      
      {/* Cattle Head Silhouette */}
      <path
        d="M14 17C14 13 18 10 24 10C30 10 34 13 34 17C34 21 31 23 31 27C31 31 28 35 24 35C20 35 17 31 17 27C17 23 14 21 14 17Z"
        fill="#fefefe"
        fillOpacity="0.12"
      />
      {/* Horn Curves */}
      <path
        d="M16 18C13 15 11 11 14 8C16 11 18 13 20 15"
        stroke="url(#goldGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 18C35 15 37 11 34 8C32 11 30 13 28 15"
        stroke="url(#goldGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ears */}
      <path
        d="M14 20C10 21 8 23 10 25C12 25 14 23 15 22"
        stroke="#86efac"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M34 20C38 21 40 23 38 25C36 25 34 23 33 22"
        stroke="#86efac"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Pulse Line */}
      <path
        d="M10 28H19L21.5 22L24.5 34L27 26L29 28H38"
        stroke="#4ade80"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cross Accent */}
      <path
        d="M24 14V18M22 16H26"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Luminous Sunset Pasture & Vet Clinic Backdrop
 * Full HD 2560px unsharp-masked image with seamless edge blending and uncropped framing.
 */
export function PastoralScene({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full h-full overflow-hidden pointer-events-none select-none relative bg-[#070e0f] ${className}`}>
      {/* High-Resolution Full HD 2560px Image - Zoomed out to natural Full HD fit */}
      <img
        src="/hero-pasture-vet-hd.jpg"
        alt="Veterinarian caring for cow in sunset pasture with cattle health tablet"
        className="w-full h-full object-cover object-[78%_center] sm:object-cover sm:object-right lg:object-contain lg:object-right ml-auto"
        style={{
          imageRendering: '-webkit-optimize-contrast',
        }}
      />

      {/* Gentle readability gradient on left for bold text, keeping vet & cow completely vivid on right */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070e0f] via-[#070e0f]/85 to-transparent lg:w-[56%] pointer-events-none" />

      {/* Subtle top edge vignette */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#070e0f]/70 to-transparent pointer-events-none" />

      {/* Soft bottom transition into page content */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#faf7f2] via-[#070e0f]/40 to-transparent pointer-events-none" />
    </div>
  )
}

/**
 * Realistic Pastoral Background for Auth & Inner Pages
 */
export function PastoralBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none ${className}`}>
      <img
        src="/hero-pasture-vet-hd.jpg"
        alt="Pasture scenery"
        className="w-full h-full object-cover object-center opacity-20 filter blur-[1px]"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#faf7f2]/95 via-[#faf7f2]/90 to-emerald-900/20" />
    </div>
  )
}
