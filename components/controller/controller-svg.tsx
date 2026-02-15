"use client"

/* Realistic top-down PS controller SVG diagrams.
   Buttons light up when pressed. L2/R2 bars fill with analog pressure. */

interface Props {
  buttons: Record<string, boolean>
  l2Analog?: number
  r2Analog?: number
  className?: string
}

const A = "#3b82f6"   // active blue
const I = "#2a2a35"   // inactive dark
const BODY = "#18181b"
const GRIP = "#1e1e24"
const STROKE = "#3f3f46"

/* ─────────────────── DualSense (PS5) ─────────────────── */
export function DualSenseSVG({ buttons, l2Analog = 0, r2Analog = 0, className }: Props) {
  const b = (n: string) => buttons[n] ? A : I
  const l2p = Math.min(l2Analog / 255, 1)
  const r2p = Math.min(r2Analog / 255, 1)
  return (
    <svg viewBox="0 0 460 340" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Body shell */}
      <path d="M120 55 Q135 22,175 14 L285 14 Q325 22,340 55 L370 130 Q400 210,385 270 Q375 305,345 310 L310 315 Q280 318,265 290 L230 250 L195 290 Q180 318,150 315 L115 310 Q85 305,75 270 Q60 210,90 130Z" fill={BODY} stroke={STROKE} strokeWidth="2.5"/>
      {/* Left grip */}
      <path d="M90 130 Q60 210,75 270 Q85 305,115 310 L150 315 Q135 320,120 310 Q80 290,65 240 Q48 180,75 120Z" fill={GRIP} stroke={STROKE} strokeWidth="1.5" opacity="0.6"/>
      {/* Right grip */}
      <path d="M370 130 Q400 210,385 270 Q375 305,345 310 L310 315 Q325 320,340 310 Q380 290,395 240 Q412 180,385 120Z" fill={GRIP} stroke={STROKE} strokeWidth="1.5" opacity="0.6"/>

      {/* Touchpad */}
      <rect x="173" y="58" width="114" height="70" rx="10" fill={b("touchpad")} stroke={STROKE} strokeWidth="1.5"/>
      <line x1="230" y1="60" x2="230" y2="126" stroke={STROKE} strokeWidth="0.5" opacity="0.3"/>

      {/* ── Left Stick ── */}
      <circle cx="168" cy="168" r="28" fill="#111116" stroke={STROKE} strokeWidth="2"/>
      <circle cx="168" cy="168" r="18" fill={b("l3")} stroke={buttons.l3 ? A : "#52525b"} strokeWidth="1.5"/>

      {/* ── Right Stick ── */}
      <circle cx="292" cy="168" r="28" fill="#111116" stroke={STROKE} strokeWidth="2"/>
      <circle cx="292" cy="168" r="18" fill={b("r3")} stroke={buttons.r3 ? A : "#52525b"} strokeWidth="1.5"/>

      {/* ── D-Pad ── */}
      <g transform="translate(108,100)">
        <rect x="8" y="-2" width="16" height="44" rx="3" fill={buttons.up || buttons.down ? A : I} stroke={STROKE} strokeWidth="1"/>
        <rect x="-5" y="11" width="42" height="16" rx="3" fill={buttons.left || buttons.right ? A : I} stroke={STROKE} strokeWidth="1"/>
        {buttons.up && <rect x="10" y="0" width="12" height="16" rx="2" fill="#93c5fd"/>}
        {buttons.down && <rect x="10" y="26" width="12" height="16" rx="2" fill="#93c5fd"/>}
        {buttons.left && <rect x="-3" y="13" width="16" height="12" rx="2" fill="#93c5fd"/>}
        {buttons.right && <rect x="19" y="13" width="16" height="12" rx="2" fill="#93c5fd"/>}
      </g>

      {/* ── Face Buttons ── */}
      {/* Triangle */}
      <circle cx="352" cy="86" r="13" fill={b("triangle")} stroke="#00d49b" strokeWidth="2.5"/>
      <polygon points="352,77 344,95 360,95" fill="none" stroke="#00d49b" strokeWidth="1.5"/>
      {/* Circle */}
      <circle cx="376" cy="110" r="13" fill={b("circle")} stroke="#ff6467" strokeWidth="2.5"/>
      <circle cx="376" cy="110" r="6" fill="none" stroke="#ff6467" strokeWidth="1.5"/>
      {/* Cross */}
      <circle cx="352" cy="134" r="13" fill={b("cross")} stroke="#6eaaff" strokeWidth="2.5"/>
      <line x1="345" y1="127" x2="359" y2="141" stroke="#6eaaff" strokeWidth="2"/>
      <line x1="359" y1="127" x2="345" y2="141" stroke="#6eaaff" strokeWidth="2"/>
      {/* Square */}
      <circle cx="328" cy="110" r="13" fill={b("square")} stroke="#f49ec4" strokeWidth="2.5"/>
      <rect x="321" y="103" width="14" height="14" rx="1" fill="none" stroke="#f49ec4" strokeWidth="1.5"/>

      {/* ── Shoulder L1/R1 ── */}
      <rect x="108" y="28" width="60" height="18" rx="6" fill={b("l1")} stroke={STROKE} strokeWidth="1.5"/>
      <text x="138" y="41" textAnchor="middle" fill="#d4d4d8" fontSize="10" fontWeight="bold" fontFamily="Arial">L1</text>
      <rect x="292" y="28" width="60" height="18" rx="6" fill={b("r1")} stroke={STROKE} strokeWidth="1.5"/>
      <text x="322" y="41" textAnchor="middle" fill="#d4d4d8" fontSize="10" fontWeight="bold" fontFamily="Arial">R1</text>

      {/* ── Triggers L2/R2 ── */}
      <rect x="108" y="6" width="60" height="18" rx="5" fill={I} stroke={STROKE} strokeWidth="1.5"/>
      <rect x="108" y="6" width={60 * l2p} height="18" rx="5" fill={l2p > 0.04 ? A : "transparent"} opacity="0.8"/>
      <text x="138" y="19" textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="bold" fontFamily="Arial">L2</text>
      <rect x="292" y="6" width="60" height="18" rx="5" fill={I} stroke={STROKE} strokeWidth="1.5"/>
      <rect x="292" y="6" width={60 * r2p} height="18" rx="5" fill={r2p > 0.04 ? A : "transparent"} opacity="0.8"/>
      <text x="322" y="19" textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="bold" fontFamily="Arial">R2</text>

      {/* ── Center buttons ── */}
      <rect x="175" y="148" width="30" height="12" rx="4" fill={b("create")} stroke={STROKE} strokeWidth="1"/>
      <text x="190" y="157" textAnchor="middle" fill="#a1a1aa" fontSize="6" fontFamily="Arial">CREATE</text>
      <rect x="255" y="148" width="30" height="12" rx="4" fill={b("options")} stroke={STROKE} strokeWidth="1"/>
      <text x="270" y="157" textAnchor="middle" fill="#a1a1aa" fontSize="6" fontFamily="Arial">OPTIONS</text>

      {/* PS button */}
      <circle cx="230" cy="205" r="12" fill={b("ps")} stroke={STROKE} strokeWidth="1.5"/>
      <text x="230" y="209" textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="bold" fontFamily="Arial">PS</text>

      {/* Mute */}
      <circle cx="230" cy="172" r="7" fill={b("mute")} stroke={STROKE} strokeWidth="1"/>
      <line x1="226" y1="172" x2="234" y2="172" stroke={buttons.mute ? "#fff" : "#71717a"} strokeWidth="1.5"/>
    </svg>
  )
}

/* ─────────────────── DualSense Edge ─────────────────── */
export function DualSenseEdgeSVG({ buttons, l2Analog = 0, r2Analog = 0, className }: Props) {
  return (
    <div className="relative">
      <DualSenseSVG buttons={buttons} l2Analog={l2Analog} r2Analog={r2Analog} className={className} />
      {/* Edge badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-orange-600/90 px-2 py-0.5">
        <span className="text-[9px] font-bold text-white tracking-widest">EDGE</span>
      </div>
      {/* Back paddle indicators */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 460 340">
        <rect x="68" y="240" width="24" height="10" rx="3" fill={buttons.paddle_l ? A : "#27272a"} stroke={STROKE} strokeWidth="1" opacity="0.7"/>
        <text x="80" y="248" textAnchor="middle" fill="#a1a1aa" fontSize="5" fontFamily="Arial">P1</text>
        <rect x="68" y="255" width="24" height="10" rx="3" fill={buttons.paddle_l2 ? A : "#27272a"} stroke={STROKE} strokeWidth="1" opacity="0.7"/>
        <text x="80" y="263" textAnchor="middle" fill="#a1a1aa" fontSize="5" fontFamily="Arial">P2</text>
        <rect x="368" y="240" width="24" height="10" rx="3" fill={buttons.paddle_r ? A : "#27272a"} stroke={STROKE} strokeWidth="1" opacity="0.7"/>
        <text x="380" y="248" textAnchor="middle" fill="#a1a1aa" fontSize="5" fontFamily="Arial">P3</text>
        <rect x="368" y="255" width="24" height="10" rx="3" fill={buttons.paddle_r2 ? A : "#27272a"} stroke={STROKE} strokeWidth="1" opacity="0.7"/>
        <text x="380" y="263" textAnchor="middle" fill="#a1a1aa" fontSize="5" fontFamily="Arial">P4</text>
      </svg>
    </div>
  )
}

/* ─────────────────── DualShock 4 (PS4) ─────────────────── */
export function DualShock4SVG({ buttons, l2Analog = 0, r2Analog = 0, className }: Props) {
  const b = (n: string) => buttons[n] ? A : I
  const l2p = Math.min(l2Analog / 255, 1)
  const r2p = Math.min(r2Analog / 255, 1)
  return (
    <svg viewBox="0 0 460 320" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Body - DS4 is wider, flatter */}
      <path d="M125 60 Q140 30,180 22 L280 22 Q320 30,335 60 L368 135 Q398 215,382 265 Q372 295,345 298 L312 302 Q288 305,275 280 L230 245 L185 280 Q172 305,148 302 L115 298 Q88 295,78 265 Q62 215,92 135Z" fill={BODY} stroke={STROKE} strokeWidth="2.5"/>
      {/* Grips */}
      <path d="M92 135 Q62 215,78 265 Q88 295,115 298 L148 302 Q132 310,118 298 Q82 280,68 235 Q52 180,80 125Z" fill={GRIP} stroke={STROKE} strokeWidth="1.5" opacity="0.5"/>
      <path d="M368 135 Q398 215,382 265 Q372 295,345 298 L312 302 Q328 310,342 298 Q378 280,392 235 Q408 180,380 125Z" fill={GRIP} stroke={STROKE} strokeWidth="1.5" opacity="0.5"/>

      {/* Light bar on top */}
      <rect x="178" y="16" width="104" height="5" rx="2.5" fill="#3b82f6" opacity="0.6"/>

      {/* Touchpad - DS4 is narrower */}
      <rect x="180" y="58" width="100" height="56" rx="7" fill={b("touchpad")} stroke={STROKE} strokeWidth="1.5"/>

      {/* ── Left Stick (higher position on DS4) ── */}
      <circle cx="165" cy="148" r="25" fill="#111116" stroke={STROKE} strokeWidth="2"/>
      <circle cx="165" cy="148" r="15" fill={b("l3")} stroke={buttons.l3 ? A : "#52525b"} strokeWidth="1.5"/>

      {/* ── Right Stick ── */}
      <circle cx="295" cy="148" r="25" fill="#111116" stroke={STROKE} strokeWidth="2"/>
      <circle cx="295" cy="148" r="15" fill={b("r3")} stroke={buttons.r3 ? A : "#52525b"} strokeWidth="1.5"/>

      {/* ── D-Pad ── */}
      <g transform="translate(112,88)">
        <rect x="8" y="-2" width="14" height="40" rx="3" fill={buttons.up || buttons.down ? A : I} stroke={STROKE} strokeWidth="1"/>
        <rect x="-5" y="11" width="40" height="14" rx="3" fill={buttons.left || buttons.right ? A : I} stroke={STROKE} strokeWidth="1"/>
        {buttons.up && <rect x="10" y="0" width="10" height="14" rx="2" fill="#93c5fd"/>}
        {buttons.down && <rect x="10" y="25" width="10" height="14" rx="2" fill="#93c5fd"/>}
        {buttons.left && <rect x="-3" y="13" width="14" height="10" rx="2" fill="#93c5fd"/>}
        {buttons.right && <rect x="19" y="13" width="14" height="10" rx="2" fill="#93c5fd"/>}
      </g>

      {/* ── Face Buttons ── */}
      <circle cx="350" cy="78" r="12" fill={b("triangle")} stroke="#00d49b" strokeWidth="2.5"/>
      <polygon points="350,70 343,87 357,87" fill="none" stroke="#00d49b" strokeWidth="1.5"/>
      <circle cx="372" cy="100" r="12" fill={b("circle")} stroke="#ff6467" strokeWidth="2.5"/>
      <circle cx="372" cy="100" r="5.5" fill="none" stroke="#ff6467" strokeWidth="1.5"/>
      <circle cx="350" cy="122" r="12" fill={b("cross")} stroke="#6eaaff" strokeWidth="2.5"/>
      <line x1="344" y1="116" x2="356" y2="128" stroke="#6eaaff" strokeWidth="2"/>
      <line x1="356" y1="116" x2="344" y2="128" stroke="#6eaaff" strokeWidth="2"/>
      <circle cx="328" cy="100" r="12" fill={b("square")} stroke="#f49ec4" strokeWidth="2.5"/>
      <rect x="322" y="94" width="12" height="12" rx="1" fill="none" stroke="#f49ec4" strokeWidth="1.5"/>

      {/* ── L1/R1 ── */}
      <rect x="116" y="34" width="54" height="17" rx="6" fill={b("l1")} stroke={STROKE} strokeWidth="1.5"/>
      <text x="143" y="46" textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="bold" fontFamily="Arial">L1</text>
      <rect x="290" y="34" width="54" height="17" rx="6" fill={b("r1")} stroke={STROKE} strokeWidth="1.5"/>
      <text x="317" y="46" textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="bold" fontFamily="Arial">R1</text>

      {/* ── L2/R2 ── */}
      <rect x="116" y="13" width="54" height="17" rx="5" fill={I} stroke={STROKE} strokeWidth="1.5"/>
      <rect x="116" y="13" width={54 * l2p} height="17" rx="5" fill={l2p > 0.04 ? A : "transparent"} opacity="0.8"/>
      <text x="143" y="25" textAnchor="middle" fill="#d4d4d8" fontSize="8" fontWeight="bold" fontFamily="Arial">L2</text>
      <rect x="290" y="13" width="54" height="17" rx="5" fill={I} stroke={STROKE} strokeWidth="1.5"/>
      <rect x="290" y="13" width={54 * r2p} height="17" rx="5" fill={r2p > 0.04 ? A : "transparent"} opacity="0.8"/>
      <text x="317" y="25" textAnchor="middle" fill="#d4d4d8" fontSize="8" fontWeight="bold" fontFamily="Arial">R2</text>

      {/* ── Share / Options ── */}
      <rect x="178" y="128" width="26" height="10" rx="3.5" fill={b("share")} stroke={STROKE} strokeWidth="1"/>
      <text x="191" y="136" textAnchor="middle" fill="#a1a1aa" fontSize="5.5" fontFamily="Arial">SHARE</text>
      <rect x="256" y="128" width="26" height="10" rx="3.5" fill={b("options")} stroke={STROKE} strokeWidth="1"/>
      <text x="269" y="136" textAnchor="middle" fill="#a1a1aa" fontSize="5.5" fontFamily="Arial">OPTIONS</text>

      {/* PS */}
      <circle cx="230" cy="185" r="11" fill={b("ps")} stroke={STROKE} strokeWidth="1.5"/>
      <text x="230" y="189" textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="bold" fontFamily="Arial">PS</text>
    </svg>
  )
}
