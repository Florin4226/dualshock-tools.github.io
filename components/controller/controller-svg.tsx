"use client"

/* Controller SVG diagrams that highlight active buttons.
   Each renders an outlined top-view of the controller with interactive button regions. */

interface ControllerSVGProps {
  buttons: Record<string, boolean>
  l2Analog?: number
  r2Analog?: number
  className?: string
}

const ON = "#3b82f6"    // blue-500 when pressed
const OFF = "#374151"   // gray-700 inactive
const BODY = "#1f2937"  // body fill
const OUTLINE = "#4b5563"

/* ─── DualSense SVG ─── */
export function DualSenseSVG({ buttons, l2Analog = 0, r2Analog = 0, className }: ControllerSVGProps) {
  const b = (name: string) => buttons[name] ? ON : OFF
  const l2Fill = l2Analog > 10 ? `rgba(59,130,246,${Math.min(l2Analog / 255, 1)})` : OFF
  const r2Fill = r2Analog > 10 ? `rgba(59,130,246,${Math.min(r2Analog / 255, 1)})` : OFF
  return (
    <svg viewBox="0 0 400 280" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <path d="M 90 40 Q 100 20, 140 15 L 260 15 Q 300 20, 310 40 L 340 100 Q 370 180, 350 230 Q 340 260, 310 260 L 280 260 Q 250 260, 240 230 L 200 200 L 160 230 Q 150 260, 120 260 L 90 260 Q 60 260, 50 230 Q 30 180, 60 100 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="2" />
      {/* Touchpad */}
      <rect x="145" y="50" width="110" height="65" rx="8" fill={b("touchpad")} stroke={OUTLINE} strokeWidth="1.5" opacity="0.7" />
      {/* Left Stick */}
      <circle cx="145" cy="150" r="24" fill={b("l3")} stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="145" cy="150" r="14" fill={buttons.l3 ? "#60a5fa" : "#111827"} />
      {/* Right Stick */}
      <circle cx="255" cy="150" r="24" fill={b("r3")} stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="255" cy="150" r="14" fill={buttons.r3 ? "#60a5fa" : "#111827"} />
      {/* D-Pad */}
      <rect x="76" y="98" width="16" height="42" rx="3" fill={buttons.up || buttons.down ? ON : OFF} stroke={OUTLINE} strokeWidth="1" />
      <rect x="63" y="111" width="42" height="16" rx="3" fill={buttons.left || buttons.right ? ON : OFF} stroke={OUTLINE} strokeWidth="1" />
      {buttons.up && <rect x="78" y="99" width="12" height="16" rx="2" fill="#93c5fd" />}
      {buttons.down && <rect x="78" y="124" width="12" height="16" rx="2" fill="#93c5fd" />}
      {buttons.left && <rect x="64" y="113" width="16" height="12" rx="2" fill="#93c5fd" />}
      {buttons.right && <rect x="88" y="113" width="16" height="12" rx="2" fill="#93c5fd" />}
      {/* Face Buttons */}
      <circle cx="316" cy="82" r="11" fill={b("triangle")} stroke="#00d49b" strokeWidth="2" />
      <text x="316" y="87" textAnchor="middle" fill="#00d49b" fontSize="14" fontWeight="bold">{"\u25B3"}</text>
      <circle cx="337" cy="103" r="11" fill={b("circle")} stroke="#ff6467" strokeWidth="2" />
      <text x="337" y="108" textAnchor="middle" fill="#ff6467" fontSize="12">{"\u25CB"}</text>
      <circle cx="316" cy="124" r="11" fill={b("cross")} stroke="#6eaaff" strokeWidth="2" />
      <text x="316" y="129" textAnchor="middle" fill="#6eaaff" fontSize="12">{"\u2715"}</text>
      <circle cx="295" cy="103" r="11" fill={b("square")} stroke="#f49ec4" strokeWidth="2" />
      <text x="295" y="108" textAnchor="middle" fill="#f49ec4" fontSize="11">{"\u25A1"}</text>
      {/* Shoulder buttons */}
      <rect x="85" y="20" width="55" height="16" rx="5" fill={b("l1")} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="112" y="32" textAnchor="middle" fill="#d1d5db" fontSize="9" fontWeight="bold">L1</text>
      <rect x="260" y="20" width="55" height="16" rx="5" fill={b("r1")} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="287" y="32" textAnchor="middle" fill="#d1d5db" fontSize="9" fontWeight="bold">R1</text>
      {/* Triggers */}
      <rect x="85" y="2" width="55" height="14" rx="4" fill={l2Fill} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="112" y="12" textAnchor="middle" fill="#d1d5db" fontSize="8" fontWeight="bold">L2</text>
      <rect x="260" y="2" width="55" height="14" rx="4" fill={r2Fill} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="287" y="12" textAnchor="middle" fill="#d1d5db" fontSize="8" fontWeight="bold">R2</text>
      {/* Center buttons */}
      <rect x="148" y="130" width="28" height="10" rx="3" fill={b("create")} stroke={OUTLINE} strokeWidth="1" />
      <text x="162" y="138" textAnchor="middle" fill="#9ca3af" fontSize="6">CREATE</text>
      <rect x="224" y="130" width="28" height="10" rx="3" fill={b("options")} stroke={OUTLINE} strokeWidth="1" />
      <text x="238" y="138" textAnchor="middle" fill="#9ca3af" fontSize="6">OPT</text>
      {/* PS button */}
      <circle cx="200" cy="180" r="10" fill={b("ps")} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="200" y="184" textAnchor="middle" fill="#d1d5db" fontSize="8" fontWeight="bold">PS</text>
      {/* Mute */}
      <circle cx="200" cy="155" r="6" fill={b("mute")} stroke={OUTLINE} strokeWidth="1" />
    </svg>
  )
}

/* ─── DualSense Edge SVG (has extra back paddles) ─── */
export function DualSenseEdgeSVG({ buttons, l2Analog = 0, r2Analog = 0, className }: ControllerSVGProps) {
  return (
    <div className="relative">
      <DualSenseSVG buttons={buttons} l2Analog={l2Analog} r2Analog={r2Analog} className={className} />
      {/* Edge badge */}
      <div className="absolute top-1 right-1 rounded bg-orange-600 px-1.5 py-0.5 text-[9px] font-bold text-white tracking-wider">EDGE</div>
    </div>
  )
}

/* ─── DualShock 4 SVG ─── */
export function DualShock4SVG({ buttons, l2Analog = 0, r2Analog = 0, className }: ControllerSVGProps) {
  const b = (name: string) => buttons[name] ? ON : OFF
  const l2Fill = l2Analog > 10 ? `rgba(59,130,246,${Math.min(l2Analog / 255, 1)})` : OFF
  const r2Fill = r2Analog > 10 ? `rgba(59,130,246,${Math.min(r2Analog / 255, 1)})` : OFF
  return (
    <svg viewBox="0 0 400 260" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <path d="M 100 50 Q 110 25, 150 20 L 250 20 Q 290 25, 300 50 L 340 120 Q 365 190, 345 230 Q 335 250, 310 250 L 280 250 Q 260 250, 245 225 L 200 195 L 155 225 Q 140 250, 120 250 L 90 250 Q 65 250, 55 230 Q 35 190, 60 120 Z"
        fill={BODY} stroke={OUTLINE} strokeWidth="2" />
      {/* Touchpad */}
      <rect x="155" y="50" width="90" height="52" rx="6" fill={b("touchpad")} stroke={OUTLINE} strokeWidth="1.5" opacity="0.7" />
      {/* Light bar */}
      <rect x="155" y="44" width="90" height="5" rx="2" fill="#3b82f6" opacity="0.5" />
      {/* Left Stick */}
      <circle cx="138" cy="130" r="22" fill={b("l3")} stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="138" cy="130" r="13" fill={buttons.l3 ? "#60a5fa" : "#111827"} />
      {/* Right Stick */}
      <circle cx="262" cy="130" r="22" fill={b("r3")} stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="262" cy="130" r="13" fill={buttons.r3 ? "#60a5fa" : "#111827"} />
      {/* D-Pad */}
      <rect x="82" y="80" width="14" height="38" rx="3" fill={buttons.up || buttons.down ? ON : OFF} stroke={OUTLINE} strokeWidth="1" />
      <rect x="70" y="92" width="38" height="14" rx="3" fill={buttons.left || buttons.right ? ON : OFF} stroke={OUTLINE} strokeWidth="1" />
      {buttons.up && <rect x="84" y="81" width="10" height="14" rx="2" fill="#93c5fd" />}
      {buttons.down && <rect x="84" y="105" width="10" height="14" rx="2" fill="#93c5fd" />}
      {buttons.left && <rect x="71" y="94" width="14" height="10" rx="2" fill="#93c5fd" />}
      {buttons.right && <rect x="93" y="94" width="14" height="10" rx="2" fill="#93c5fd" />}
      {/* Face Buttons */}
      <circle cx="318" cy="72" r="10" fill={b("triangle")} stroke="#00d49b" strokeWidth="2" />
      <text x="318" y="76" textAnchor="middle" fill="#00d49b" fontSize="13" fontWeight="bold">{"\u25B3"}</text>
      <circle cx="338" cy="92" r="10" fill={b("circle")} stroke="#ff6467" strokeWidth="2" />
      <text x="338" y="96" textAnchor="middle" fill="#ff6467" fontSize="11">{"\u25CB"}</text>
      <circle cx="318" cy="112" r="10" fill={b("cross")} stroke="#6eaaff" strokeWidth="2" />
      <text x="318" y="116" textAnchor="middle" fill="#6eaaff" fontSize="11">{"\u2715"}</text>
      <circle cx="298" cy="92" r="10" fill={b("square")} stroke="#f49ec4" strokeWidth="2" />
      <text x="298" y="96" textAnchor="middle" fill="#f49ec4" fontSize="10">{"\u25A1"}</text>
      {/* Shoulders */}
      <rect x="96" y="26" width="50" height="14" rx="5" fill={b("l1")} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="121" y="37" textAnchor="middle" fill="#d1d5db" fontSize="9" fontWeight="bold">L1</text>
      <rect x="254" y="26" width="50" height="14" rx="5" fill={b("r1")} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="279" y="37" textAnchor="middle" fill="#d1d5db" fontSize="9" fontWeight="bold">R1</text>
      {/* Triggers */}
      <rect x="96" y="10" width="50" height="13" rx="4" fill={l2Fill} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="121" y="20" textAnchor="middle" fill="#d1d5db" fontSize="8" fontWeight="bold">L2</text>
      <rect x="254" y="10" width="50" height="13" rx="4" fill={r2Fill} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="279" y="20" textAnchor="middle" fill="#d1d5db" fontSize="8" fontWeight="bold">R2</text>
      {/* Share / Options */}
      <rect x="153" y="115" width="24" height="9" rx="3" fill={b("share")} stroke={OUTLINE} strokeWidth="1" />
      <text x="165" y="122" textAnchor="middle" fill="#9ca3af" fontSize="5">SHARE</text>
      <rect x="223" y="115" width="24" height="9" rx="3" fill={b("options")} stroke={OUTLINE} strokeWidth="1" />
      <text x="235" y="122" textAnchor="middle" fill="#9ca3af" fontSize="5">OPT</text>
      {/* PS */}
      <circle cx="200" cy="165" r="9" fill={b("ps")} stroke={OUTLINE} strokeWidth="1.5" />
      <text x="200" y="169" textAnchor="middle" fill="#d1d5db" fontSize="8" fontWeight="bold">PS</text>
    </svg>
  )
}
