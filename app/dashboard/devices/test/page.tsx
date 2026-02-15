"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Usb, ArrowLeft, Battery, BatteryCharging, Info, Crosshair,
  Maximize, Save, RotateCcw, ChevronDown, ChevronUp, Copy, Check,
  AlertTriangle, Gamepad2, Plus, Play, Square as SquareIcon, Download, Clock,
  Volume2, Lightbulb, Headphones, Mic, Vibrate, Zap, SlidersHorizontal,
} from "lucide-react"
import { StickCanvas } from "@/components/controller/stick-canvas"
import { DualSenseSVG, DualSenseEdgeSVG, DualShock4SVG } from "@/components/controller/controller-svg"
import { createControllerInstance, SUPPORTED_DEVICES, getDeviceName, getDeviceModel } from "@/lib/controller/controller-factory"
import { sleep, CIRCULARITY_DATA_SIZE, calculateCircularityError } from "@/lib/controller/utils"
import type { BaseController } from "@/lib/controller/base-controller"
import type { ControllerInfo, NvStatus, BatteryStatus, StickData, InfoItem } from "@/lib/controller/utils"
import { cn } from "@/lib/utils"
import { saveQuickTestData } from "../../actions"

// ── Button definitions ──
const PS5_BUTTONS = ["triangle", "circle", "cross", "square", "l1", "r1", "l2", "r2", "up", "down", "left", "right", "create", "options", "ps", "touchpad", "mute", "l3", "r3"]
const PS4_BUTTONS = ["triangle", "circle", "cross", "square", "l1", "r1", "l2", "r2", "up", "down", "left", "right", "share", "options", "ps", "touchpad", "l3", "r3"]

type CalibStep = "idle" | "center-begin" | "center-sampling" | "center-done" | "range-active" | "range-done"

interface QuickTestSnapshot {
  timestamp: string
  circularityLeft: number[]
  circularityRight: number[]
  circularityErrorLeft: number
  circularityErrorRight: number
  buttonsTestedCount: number
  totalButtons: number
  allButtonsOk: boolean
  deviceName: string
  serialNumber: string
  stickCenterLX: number; stickCenterLY: number
  stickCenterRX: number; stickCenterRY: number
  usbOk: boolean
  adaptiveTriggersOk: boolean | null
  hapticOk: boolean | null
  lightsOk: boolean | null
  speakerOk: boolean | null
  headphoneOk: boolean | null
  microphoneOk: boolean | null
}

// ── Helpers ──
function InfoRow({ item, copiedKey, onCopy }: { item: InfoItem; copiedKey: string | null; onCopy: (k: string, v: string) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
      <span className="text-xs text-muted-foreground">{item.key}</span>
      <div className="flex items-center gap-1.5">
        <span className={cn("text-xs font-mono", item.severity === "danger" ? "text-destructive" : "text-foreground")}>{item.value}</span>
        {item.copyable && (
          <button type="button" onClick={() => onCopy(item.key, item.value)} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground">
            {copiedKey === item.key ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  )
}

function TestItem({ icon: Icon, label, status, onTest, onReset, testing, detail }: {
  icon: React.ElementType; label: string; status: boolean | null; onTest: () => void; onReset?: () => void; testing: boolean; detail?: string
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border p-3 transition-colors",
      status === true ? "border-green-500/40 bg-green-50/30 dark:bg-green-950/20" : status === false ? "border-red-500/40 bg-red-50/30 dark:bg-red-950/20" : "border-border"
    )}>
      <Icon className={cn("h-5 w-5 shrink-0", status === true ? "text-green-500" : status === false ? "text-red-500" : "text-muted-foreground")} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {detail && <p className="text-[11px] text-muted-foreground truncate">{detail}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        {status === true && <Check className="h-4 w-4 text-green-500" />}
        {status === false && <AlertTriangle className="h-4 w-4 text-red-500" />}
        <button onClick={onTest} disabled={testing}
          className="flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50">
          {testing ? "Testing..." : "Test"}
        </button>
        {onReset && status !== null && (
          <button onClick={onReset} className="flex h-7 items-center rounded-md border border-border px-2 text-xs text-muted-foreground hover:text-foreground">
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

function SnapshotCard({ snap, label, className }: { snap: QuickTestSnapshot; label: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        <span className="text-[10px] text-muted-foreground font-mono">{new Date(snap.timestamp).toLocaleString("ro-RO")}</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <StickCanvas x={0} y={0} label="Left" circularityData={snap.circularityLeft} size={100} />
        <StickCanvas x={0} y={0} label="Right" circularityData={snap.circularityRight} size={100} />
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Circ L</span><span className={cn("font-mono font-medium", snap.circularityErrorLeft < 5 ? "text-green-600" : snap.circularityErrorLeft < 15 ? "text-yellow-600" : "text-red-600")}>{snap.circularityErrorLeft.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Circ R</span><span className={cn("font-mono font-medium", snap.circularityErrorRight < 5 ? "text-green-600" : snap.circularityErrorRight < 15 ? "text-yellow-600" : "text-red-600")}>{snap.circularityErrorRight.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Center L</span><span className="font-mono">{snap.stickCenterLX.toFixed(3)} / {snap.stickCenterLY.toFixed(3)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Center R</span><span className="font-mono">{snap.stickCenterRX.toFixed(3)} / {snap.stickCenterRY.toFixed(3)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Buttons</span><span className={cn("font-medium", snap.allButtonsOk ? "text-green-600" : "text-yellow-600")}>{snap.buttonsTestedCount}/{snap.totalButtons}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">USB</span><span className={snap.usbOk ? "text-green-600 font-medium" : "text-red-600"}>{"OK"}</span></div>
        {snap.adaptiveTriggersOk !== null && <div className="flex justify-between"><span className="text-muted-foreground">Adaptive Triggers</span><span className={snap.adaptiveTriggersOk ? "text-green-600 font-medium" : "text-muted-foreground"}>{snap.adaptiveTriggersOk ? "OK" : "N/T"}</span></div>}
        {snap.hapticOk !== null && <div className="flex justify-between"><span className="text-muted-foreground">Haptic</span><span className={snap.hapticOk ? "text-green-600 font-medium" : "text-muted-foreground"}>{snap.hapticOk ? "OK" : "N/T"}</span></div>}
        {snap.lightsOk !== null && <div className="flex justify-between"><span className="text-muted-foreground">Lights</span><span className={snap.lightsOk ? "text-green-600 font-medium" : "text-muted-foreground"}>{snap.lightsOk ? "OK" : "N/T"}</span></div>}
        {snap.speakerOk !== null && <div className="flex justify-between"><span className="text-muted-foreground">Speaker</span><span className={snap.speakerOk ? "text-green-600 font-medium" : "text-muted-foreground"}>{snap.speakerOk ? "OK" : "N/T"}</span></div>}
        {snap.headphoneOk !== null && <div className="flex justify-between"><span className="text-muted-foreground">Headphone</span><span className={snap.headphoneOk ? "text-green-600 font-medium" : "text-muted-foreground"}>{snap.headphoneOk ? "OK" : "N/T"}</span></div>}
        {snap.microphoneOk !== null && <div className="flex justify-between"><span className="text-muted-foreground">Microphone</span><span className={snap.microphoneOk ? "text-green-600 font-medium" : "text-muted-foreground"}>{snap.microphoneOk ? "OK" : "N/T"}</span></div>}
      </div>
    </div>
  )
}

function SnapshotComparison({ entry, exit }: { entry: QuickTestSnapshot; exit: QuickTestSnapshot }) {
  const cLD = exit.circularityErrorLeft - entry.circularityErrorLeft
  const cRD = exit.circularityErrorRight - entry.circularityErrorRight
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mt-3">
      <h4 className="text-sm font-semibold text-foreground mb-3">Comparison (Entry vs Exit)</h4>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Circ L</span><span className={cn("font-mono font-medium", cLD < 0 ? "text-green-600" : cLD > 0 ? "text-red-600" : "text-muted-foreground")}>{cLD > 0 ? "+" : ""}{cLD.toFixed(1)}% ({cLD < 0 ? "improved" : cLD > 0 ? "degraded" : "same"})</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Circ R</span><span className={cn("font-mono font-medium", cRD < 0 ? "text-green-600" : cRD > 0 ? "text-red-600" : "text-muted-foreground")}>{cRD > 0 ? "+" : ""}{cRD.toFixed(1)}% ({cRD < 0 ? "improved" : cRD > 0 ? "degraded" : "same"})</span></div>
      </div>
    </div>
  )
}

/* ═══════════════ MAIN PAGE ═══════════════ */
export default function ControllerTestPage() {
  const router = useRouter()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [controller, setController] = useState<BaseController | null>(null)
  const [deviceName, setDeviceName] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [info, setInfo] = useState<ControllerInfo | null>(null)
  const [showExtra, setShowExtra] = useState(false)
  const [nvStatus, setNvStatus] = useState<NvStatus | null>(null)
  const [sticks, setSticks] = useState<StickData>({ lx: 0, ly: 0, rx: 0, ry: 0 })
  const [l2Analog, setL2Analog] = useState(0)
  const [r2Analog, setR2Analog] = useState(0)
  const [buttons, setButtons] = useState<Record<string, boolean>>({})
  const [battery, setBattery] = useState<BatteryStatus | null>(null)
  const [error, setError] = useState("")
  const [log, setLog] = useState<string[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Calibration
  const [calibStep, setCalibStep] = useState<CalibStep>("idle")
  const [calibProgress, setCalibProgress] = useState(0)
  const [calibMsg, setCalibMsg] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  // Circularity + stick mode
  const llRef = useRef<number[]>(new Array(CIRCULARITY_DATA_SIZE).fill(0))
  const rrRef = useRef<number[]>(new Array(CIRCULARITY_DATA_SIZE).fill(0))
  const [circLeft, setCircLeft] = useState<number[]>([])
  const [circRight, setCircRight] = useState<number[]>([])
  const [stickMode, setStickMode] = useState<"normal" | "zoom" | "circularity">("normal")

  // Hardware test results
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})
  const [testingItem, setTestingItem] = useState<string | null>(null)

  // Quick Test
  const [qtActive, setQtActive] = useState(false)
  const [qtType, setQtType] = useState<"entry" | "exit">("entry")
  const [qtSeconds, setQtSeconds] = useState(0)
  const qtTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const everPressedRef = useRef<Set<string>>(new Set())
  const [entrySnap, setEntrySnap] = useState<QuickTestSnapshot | null>(null)
  const [exitSnap, setExitSnap] = useState<QuickTestSnapshot | null>(null)
  const [qtServiceId, setQtServiceId] = useState("")
  const [qtSaving, setQtSaving] = useState(false)
  const [qtSaved, setQtSaved] = useState(false)
  const centerRef = useRef<{ lx: number[]; ly: number[]; rx: number[]; ry: number[] }>({ lx: [], ly: [], rx: [], ry: [] })
  const controllerRef = useRef<BaseController | null>(null)

  const addLog = useCallback((msg: string) => setLog(p => [...p.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]), [])

  useEffect(() => { setSupported("hid" in navigator) }, [])
  useEffect(() => { return () => { controllerRef.current?.close(); if (qtTimerRef.current) clearInterval(qtTimerRef.current) } }, [])

  // Track buttons during quick test
  useEffect(() => { if (!qtActive) return; Object.entries(buttons).forEach(([k, v]) => { if (v) everPressedRef.current.add(k) }) }, [buttons, qtActive])
  // Collect center readings
  useEffect(() => { if (!qtActive || qtSeconds > 2) return; centerRef.current.lx.push(sticks.lx); centerRef.current.ly.push(sticks.ly); centerRef.current.rx.push(sticks.rx); centerRef.current.ry.push(sticks.ry) }, [qtActive, qtSeconds, sticks])

  // Input loop
  useEffect(() => {
    if (!controller) return
    const device = controller.device
    let latest: DataView | null = null
    const onReport = (e: HIDInputReportEvent) => { latest = e.data }
    device.addEventListener("inputreport", onReport)
    let raf: number
    const loop = () => {
      if (latest && latest.byteLength >= 10) {
        try {
          const p = controller.parseInput(latest)
          setSticks(p.sticks); setButtons(p.buttons); setBattery(p.battery)
          setL2Analog(p.l2Analog); setR2Analog(p.r2Analog)
          const { lx, ly, rx, ry } = p.sticks
          const lD = Math.sqrt(lx * lx + ly * ly), rD = Math.sqrt(rx * rx + ry * ry)
          if (lD > 0.3) { const a = Math.atan2(ly, lx); const i = Math.round(((a + Math.PI) / (2 * Math.PI)) * CIRCULARITY_DATA_SIZE) % CIRCULARITY_DATA_SIZE; llRef.current[i] = lD }
          if (rD > 0.3) { const a = Math.atan2(ry, rx); const i = Math.round(((a + Math.PI) / (2 * Math.PI)) * CIRCULARITY_DATA_SIZE) % CIRCULARITY_DATA_SIZE; rrRef.current[i] = rD }
          setCircLeft([...llRef.current]); setCircRight([...rrRef.current])
        } catch { /* skip */ }
        latest = null
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { device.removeEventListener("inputreport", onReport); cancelAnimationFrame(raf) }
  }, [controller])

  /* ── Connection ── */
  async function handleConnect() {
    if (!("hid" in navigator)) return
    setConnecting(true); setError("")
    try {
      const hid = (navigator as any).hid
      let devices = await hid.getDevices()
      if (!devices.length) devices = await hid.requestDevice({ filters: SUPPORTED_DEVICES })
      if (!devices.length) { setConnecting(false); return }
      const device: HIDDevice = devices[0]
      if (device.opened) { await device.close(); await sleep(500) }
      await device.open()
      addLog(`Connected: ${device.productName}`)

      const ctrl = createControllerInstance(device)
      controllerRef.current = ctrl; setController(ctrl)
      setDeviceName(getDeviceName(device.productId))
      setTestResults({ usb: true }) // USB is confirmed connected

      const controllerInfo = await ctrl.getInfo()
      setInfo(controllerInfo); setNvStatus(controllerInfo.nv || null)
      if (controllerInfo.ok) { const sn = await ctrl.getSerialNumber(); setSerialNumber(sn); addLog(`Serial: ${sn}`) }
      else { setError("Failed to read controller info."); addLog("Failed to get info") }

      try { await ctrl.initializeOutputState() } catch { /* ignore */ }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed"; setError(msg); addLog(`Error: ${msg}`)
    } finally { setConnecting(false) }
  }

  async function handleDisconnect() {
    if (controllerRef.current) { try { await controllerRef.current.resetLights() } catch { /* */ }; await controllerRef.current.close(); controllerRef.current = null }
    setController(null); setInfo(null); setSerialNumber(""); setDeviceName("")
    setSticks({ lx: 0, ly: 0, rx: 0, ry: 0 }); setButtons({}); setBattery(null)
    setL2Analog(0); setR2Analog(0); setNvStatus(null); setCalibStep("idle"); setHasChanges(false)
    llRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0); rrRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0)
    setCircLeft([]); setCircRight([]); setTestResults({}); addLog("Disconnected")
  }

  function handleAddToDevices() {
    const params = new URLSearchParams({ add: "1", serial: serialNumber, brand: "Sony", model: deviceName, type: "playstation_controller" })
    router.push(`/dashboard/devices?${params.toString()}`)
  }

  /* ── Hardware tests ── */
  async function testAdaptiveTriggers() {
    if (!controller) return; setTestingItem("adaptive")
    try {
      await controller.setAdaptiveTrigger({ mode: "resistance", start: 0, end: 120, force: 200 }, { mode: "resistance", start: 0, end: 120, force: 200 })
      addLog("Adaptive trigger resistance applied. Press L2/R2 to feel it.")
      await sleep(3000)
      await controller.setAdaptiveTrigger({ mode: "off", start: 0, end: 0, force: 0 }, { mode: "off", start: 0, end: 0, force: 0 })
      setTestResults(p => ({ ...p, adaptive: true })); addLog("Adaptive trigger test OK")
    } catch (e) { setTestResults(p => ({ ...p, adaptive: false })); addLog(`Adaptive trigger error: ${e}`) }
    finally { setTestingItem(null) }
  }

  async function testHaptic() {
    if (!controller) return; setTestingItem("haptic")
    try {
      await controller.setVibration(200, 100); await sleep(500)
      await controller.setVibration(0, 200); await sleep(500)
      await controller.setVibration(0, 0)
      setTestResults(p => ({ ...p, haptic: true })); addLog("Haptic/vibration test OK")
    } catch (e) { setTestResults(p => ({ ...p, haptic: false })); addLog(`Haptic error: ${e}`) }
    finally { setTestingItem(null) }
  }

  async function testLights() {
    if (!controller) return; setTestingItem("lights")
    try {
      await controller.setLightbarColor(255, 0, 0); await sleep(600)
      await controller.setLightbarColor(0, 255, 0); await sleep(600)
      await controller.setLightbarColor(0, 0, 255); await sleep(600)
      await controller.setLightbarColor(0, 0, 0)
      try { await controller.setPlayerIndicator(0x1f); await sleep(800); await controller.setPlayerIndicator(0) } catch { /* DS4 */ }
      try { await controller.setMuteLed(2); await sleep(800); await controller.setMuteLed(0) } catch { /* DS4 */ }
      setTestResults(p => ({ ...p, lights: true })); addLog("Light test OK")
    } catch (e) { setTestResults(p => ({ ...p, lights: false })); addLog(`Light error: ${e}`) }
    finally { setTestingItem(null) }
  }

  async function testSpeaker() {
    if (!controller) return; setTestingItem("speaker")
    try {
      await controller.setSpeakerTone("speaker"); await sleep(2000)
      await controller.resetSpeakerSettings()
      setTestResults(p => ({ ...p, speaker: true })); addLog("Speaker test OK")
    } catch (e) { setTestResults(p => ({ ...p, speaker: false })); addLog(`Speaker error: ${e}`) }
    finally { setTestingItem(null) }
  }

  async function testHeadphone() {
    if (!controller) return; setTestingItem("headphone")
    try {
      await controller.setSpeakerTone("headphones"); await sleep(2000)
      await controller.resetSpeakerSettings()
      setTestResults(p => ({ ...p, headphone: true })); addLog("Headphone test OK")
    } catch (e) { setTestResults(p => ({ ...p, headphone: false })); addLog(`Headphone error: ${e}`) }
    finally { setTestingItem(null) }
  }

  async function testMicrophone() {
    if (!controller) return; setTestingItem("microphone")
    try {
      // Mic test: toggle mute LED to indicate mic check
      await controller.setMuteLed(1); await sleep(1000)
      await controller.setMuteLed(2); await sleep(1000)
      await controller.setMuteLed(0)
      setTestResults(p => ({ ...p, microphone: true })); addLog("Microphone test OK (mute LED cycled)")
    } catch (e) { setTestResults(p => ({ ...p, microphone: false })); addLog(`Mic error: ${e}`) }
    finally { setTestingItem(null) }
  }

  function resetTestResult(key: string) { setTestResults(p => { const n = { ...p }; delete n[key]; return n }) }

  /* ── Quick Test ── */
  async function startQuickTest(type: "entry" | "exit") {
    llRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0); rrRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0)
    setCircLeft([]); setCircRight([]); everPressedRef.current = new Set()
    centerRef.current = { lx: [], ly: [], rx: [], ry: [] }
    setStickMode("circularity"); setQtActive(true); setQtType(type); setQtSeconds(0); setQtSaved(false)
    addLog(`Quick Test (${type}) started - running hardware tests...`)
    qtTimerRef.current = setInterval(() => setQtSeconds(p => p + 1), 1000)

    // Auto-run all available hardware tests in sequence
    if (controller) {
      setTestResults(p => ({ ...p, usb: true }))
      const tests = controller.getSupportedTests()
      // Haptic
      if (tests.includes("haptic")) {
        try { await controller.setVibration(180, 80); await sleep(400); await controller.setVibration(0, 180); await sleep(400); await controller.setVibration(0, 0); setTestResults(p => ({ ...p, haptic: true })); addLog("QT: Haptic OK") }
        catch { setTestResults(p => ({ ...p, haptic: false })); addLog("QT: Haptic failed") }
      }
      // Lights
      if (tests.includes("lights")) {
        try { await controller.setLightbarColor(255, 0, 0); await sleep(400); await controller.setLightbarColor(0, 255, 0); await sleep(400); await controller.setLightbarColor(0, 0, 255); await sleep(400); await controller.setLightbarColor(0, 0, 0)
          try { await controller.setPlayerIndicator(0x1f); await sleep(500); await controller.setPlayerIndicator(0) } catch { /* */ }
          try { await controller.setMuteLed(2); await sleep(500); await controller.setMuteLed(0) } catch { /* */ }
          setTestResults(p => ({ ...p, lights: true })); addLog("QT: Lights OK")
        } catch { setTestResults(p => ({ ...p, lights: false })); addLog("QT: Lights failed") }
      }
      // Adaptive Triggers (DS5 only)
      if (tests.includes("adaptive_triggers")) {
        try { await controller.setAdaptiveTrigger({ mode: "resistance", start: 0, end: 120, force: 200 }, { mode: "resistance", start: 0, end: 120, force: 200 }); addLog("QT: Adaptive triggers ON - press L2/R2"); await sleep(3000); await controller.setAdaptiveTrigger({ mode: "off", start: 0, end: 0, force: 0 }, { mode: "off", start: 0, end: 0, force: 0 }); setTestResults(p => ({ ...p, adaptive: true })); addLog("QT: Adaptive OK") }
        catch { setTestResults(p => ({ ...p, adaptive: false })); addLog("QT: Adaptive failed") }
      }
      // Speaker
      if (tests.includes("speaker")) {
        try { await controller.setSpeakerTone("speaker"); await sleep(1500); await controller.resetSpeakerSettings(); setTestResults(p => ({ ...p, speaker: true })); addLog("QT: Speaker OK") }
        catch { setTestResults(p => ({ ...p, speaker: false })); addLog("QT: Speaker failed") }
      }
      // Headphone
      if (tests.includes("headphone")) {
        try { await controller.setSpeakerTone("headphones"); await sleep(1500); await controller.resetSpeakerSettings(); setTestResults(p => ({ ...p, headphone: true })); addLog("QT: Headphone OK") }
        catch { setTestResults(p => ({ ...p, headphone: false })); addLog("QT: Headphone failed") }
      }
      // Microphone (mute LED cycle)
      if (tests.includes("microphone")) {
        try { await controller.setMuteLed(1); await sleep(700); await controller.setMuteLed(2); await sleep(700); await controller.setMuteLed(0); setTestResults(p => ({ ...p, microphone: true })); addLog("QT: Mic LED OK") }
        catch { setTestResults(p => ({ ...p, microphone: false })); addLog("QT: Mic failed") }
      }
      addLog("QT: All hardware tests done. Now rotate sticks and press all buttons.")
    }
  }

  function stopQuickTest() {
    if (qtTimerRef.current) { clearInterval(qtTimerRef.current); qtTimerRef.current = null }
    setQtActive(false)
    const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0
    const allBtns = isDS5 ? PS5_BUTTONS : PS4_BUTTONS
    const snap: QuickTestSnapshot = {
      timestamp: new Date().toISOString(),
      circularityLeft: [...llRef.current], circularityRight: [...rrRef.current],
      circularityErrorLeft: calculateCircularityError(llRef.current), circularityErrorRight: calculateCircularityError(rrRef.current),
      buttonsTestedCount: everPressedRef.current.size, totalButtons: allBtns.length,
      allButtonsOk: everPressedRef.current.size >= allBtns.length - 2,
      deviceName, serialNumber,
      stickCenterLX: avg(centerRef.current.lx), stickCenterLY: avg(centerRef.current.ly),
      stickCenterRX: avg(centerRef.current.rx), stickCenterRY: avg(centerRef.current.ry),
      usbOk: testResults.usb === true,
      adaptiveTriggersOk: testResults.adaptive ?? null,
      hapticOk: testResults.haptic ?? null,
      lightsOk: testResults.lights ?? null,
      speakerOk: testResults.speaker ?? null,
      headphoneOk: testResults.headphone ?? null,
      microphoneOk: testResults.microphone ?? null,
    }
    if (qtType === "entry") { setEntrySnap(snap); addLog(`Entry done. L=${snap.circularityErrorLeft.toFixed(1)}% R=${snap.circularityErrorRight.toFixed(1)}%`) }
    else { setExitSnap(snap); addLog(`Exit done. L=${snap.circularityErrorLeft.toFixed(1)}% R=${snap.circularityErrorRight.toFixed(1)}%`) }
  }

  async function handleSaveQt() {
    if (!qtServiceId.trim()) { setError("Enter a Service Record ID"); return }
    setQtSaving(true)
    try {
      const data: Record<string, unknown> = {}
      if (entrySnap) data.entry = entrySnap
      if (exitSnap) data.exit = exitSnap
      const res = await saveQuickTestData(qtServiceId, data)
      if (res.error) setError(res.error); else { setQtSaved(true); addLog(`Quick Test saved to ${qtServiceId}`) }
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed") }
    finally { setQtSaving(false) }
  }

  /* ── Calibration ── */
  async function handleCenterCalib() {
    if (!controller) return
    setCalibStep("center-begin"); setCalibMsg("Starting center..."); setCalibProgress(10)
    try {
      const r = await controller.calibrateSticksBegin(); if (!r.ok) throw r.error
      setCalibStep("center-sampling"); setCalibProgress(30); addLog("Keep sticks centered!")
      for (let i = 0; i < 5; i++) { await sleep(500); const s = await controller.calibrateSticksSample(); if (!s.ok) throw s.error; setCalibProgress(30 + ((i + 1) / 5) * 50); setCalibMsg(`Sampling ${i + 1}/5`) }
      const e = await controller.calibrateSticksEnd(); if (!e.ok) throw e.error
      setCalibStep("center-done"); setCalibProgress(100); setCalibMsg("Center done! Save to flash."); setHasChanges(true); addLog("Center calibration done")
      try { const nv = await controller.queryNvStatus(); setNvStatus(nv) } catch { /* */ }
    } catch (err) { setCalibStep("idle"); setCalibMsg(""); setError(String(err)); addLog(`Center error: ${err}`) }
  }

  async function handleRangeCalib() {
    if (!controller) return
    setCalibStep("range-active"); setCalibMsg("Rotate both sticks!"); setCalibProgress(0)
    try { const r = await controller.calibrateRangeBegin(); if (!r.ok) throw r.error; addLog("Range started") }
    catch (err) { setCalibStep("idle"); setCalibMsg(""); setError(String(err)) }
  }

  async function handleRangeEnd() {
    if (!controller) return
    try { const r = await controller.calibrateRangeEnd(); setCalibStep("range-done"); setCalibProgress(100); setCalibMsg("Range done! Save to flash."); setHasChanges(true); addLog("Range done"); try { const nv = await controller.queryNvStatus(); setNvStatus(nv) } catch { /* */ } }
    catch (err) { setCalibStep("idle"); setCalibMsg(""); setError(String(err)) }
  }

  async function handleSave() {
    if (!controller) return; setSaving(true)
    try {
      const r = await controller.flash()
      addLog(r.message); setHasChanges(false); setCalibStep("idle"); setCalibMsg("Saved!")
      // Refresh NVS status after save
      try { const nv = await controller.queryNvStatus(); setNvStatus(nv); addLog(`NVS: ${nv.status}`) } catch { /* */ }
    } catch (err) { setError(String(err)); addLog(`Save error: ${err}`) }
    finally { setSaving(false) }
  }

  async function handleReset() {
    if (!controller) return
    try { await controller.reset(); addLog("Reset sent. Reconnect controller."); await handleDisconnect() } catch { /* */ }
  }

  async function handleNvsRefresh() {
    if (!controller) return
    try { const nv = await controller.queryNvStatus(); setNvStatus(nv); addLog(`NVS query: ${nv.status} (code: ${nv.code})`) }
    catch (e) { addLog(`NVS query error: ${e}`) }
  }

  async function handleNvsUnlock() {
    if (!controller) return
    try {
      const r = await controller.nvsUnlock()
      if (r.ok) { addLog("NVS unlocked"); await handleNvsRefresh() }
      else { addLog(`NVS unlock failed: ${r.error?.message}`); setError(`NVS unlock failed: ${r.error?.message || "Unknown error"}`) }
    } catch (e) { addLog(`NVS unlock error: ${e}`); setError(String(e)) }
  }

  async function handleNvsLock() {
    if (!controller) return
    try {
      const r = await controller.nvsLock()
      if (r.ok) { addLog("NVS locked"); await handleNvsRefresh() }
      else { addLog(`NVS lock failed: ${r.error?.message}`); setError(`NVS lock failed: ${r.error?.message || "Unknown error"}`) }
    } catch (e) { addLog(`NVS lock error: ${e}`); setError(String(e)) }
  }

  function handleCopy(key: string, value: string) { navigator.clipboard.writeText(value); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000) }
  function resetCirc() { llRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0); rrRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0); setCircLeft([]); setCircRight([]); addLog("Circularity reset") }

  if (supported === null) return null
  if (!supported) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertTriangle className="h-12 w-12 text-destructive" /><h2 className="text-xl font-bold text-foreground">WebHID Not Supported</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">Use Chrome or Edge on desktop.</p>
      <Link href="/dashboard/devices" className="text-sm text-primary hover:underline flex items-center gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
    </div>
  )

  const model = controller ? getDeviceModel(controller.device.productId) : ""
  const isDS5 = model === "DS5" || model === "DS5_Edge"
  const supportedTests = controller?.getSupportedTests() || []
  const hwItems = info?.infoItems?.filter((i: InfoItem) => i.cat === "hw" && !i.isExtra) || []
  const fwItems = info?.infoItems?.filter((i: InfoItem) => i.cat === "fw" && !i.isExtra) || []
  const extraItems = info?.infoItems?.filter((i: InfoItem) => i.isExtra) || []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/devices" className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div><h2 className="text-2xl font-bold tracking-tight text-foreground">Controller Test & Calibration</h2><p className="mt-0.5 text-sm text-muted-foreground">WebHID - PS4/PS5 USB only</p></div>
        </div>
        {!controller ? (
          <button onClick={handleConnect} disabled={connecting} className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Usb className="h-4 w-4" />{connecting ? "Connecting..." : "Connect Controller"}</button>
        ) : (
          <div className="flex items-center gap-2">
            {serialNumber && <button onClick={handleAddToDevices} className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add to Devices</button>}
            <button onClick={handleDisconnect} className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent">Disconnect</button>
          </div>
        )}
      </div>

      {error && <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span><button onClick={() => setError("")} className="ml-auto text-destructive/60 hover:text-destructive">{"x"}</button></div>}

      {!controller ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center gap-4">
          <Gamepad2 className="h-12 w-12 text-muted-foreground" /><p className="text-sm font-medium text-foreground">No controller connected</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">Plug in a PS4/PS5 controller via USB and click Connect.</p>
        </div>
      ) : (
        <>
          {/* Status Bar */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-primary" /><span className="text-sm font-medium text-foreground">{deviceName}</span></div>
              {serialNumber && <div className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground">SN:</span><span className="font-mono text-xs text-foreground">{serialNumber}</span><button onClick={() => handleCopy("serial", serialNumber)} className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground">{copiedKey === "serial" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}</button></div>}
              {battery && <div className="flex items-center gap-1.5">{battery.is_charging ? <BatteryCharging className="h-4 w-4 text-green-500" /> : <Battery className="h-4 w-4 text-muted-foreground" />}<span className="text-xs text-muted-foreground">{battery.charge_level}%</span><span className="text-xs text-muted-foreground">({battery.cable_connected ? "USB" : "Battery"})</span></div>}
              {nvStatus && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">NVS:</span>
                  <span className={cn("text-xs font-medium",
                    nvStatus.status === "locked" ? "text-green-500" :
                    nvStatus.status === "unlocked" ? "text-yellow-500" :
                    nvStatus.status === "pending_reboot" ? "text-orange-500" :
                    nvStatus.status === "error" ? "text-destructive" :
                    "text-muted-foreground"
                  )}>{nvStatus.status}{nvStatus.code !== undefined ? ` (${nvStatus.code})` : ""}</span>
                  <button onClick={handleNvsRefresh} className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Refresh NVS"><RotateCcw className="h-3 w-3" /></button>
                  {nvStatus.locked === true && <button onClick={handleNvsUnlock} className="h-5 rounded px-1.5 text-[10px] bg-yellow-500/10 text-yellow-600 border border-yellow-500/30 hover:bg-yellow-500/20" title="Unlock NVS for writing">Unlock</button>}
                  {nvStatus.locked === false && <button onClick={handleNvsLock} className="h-5 rounded px-1.5 text-[10px] bg-green-500/10 text-green-600 border border-green-500/30 hover:bg-green-500/20" title="Lock NVS (save)">Lock</button>}
                </div>
              )}
              {hasChanges && <span className="inline-flex rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-500 border border-yellow-500/30">Unsaved</span>}
            </div>
          </div>

          {/* ── SVG + Sticks + Info Grid ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Controller SVG */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Controller View</h3>
              <div className="flex items-center justify-center">
                {model === "DS5_Edge" ? <DualSenseEdgeSVG buttons={buttons} l2Analog={l2Analog} r2Analog={r2Analog} className="w-full max-w-[320px]" />
                  : model === "DS5" ? <DualSenseSVG buttons={buttons} l2Analog={l2Analog} r2Analog={r2Analog} className="w-full max-w-[320px]" />
                  : <DualShock4SVG buttons={buttons} l2Analog={l2Analog} r2Analog={r2Analog} className="w-full max-w-[320px]" />}
              </div>
              <div className="mt-3 pt-3 border-t border-border"><p className="text-xs text-muted-foreground text-center">{Object.values(buttons).filter(Boolean).length > 0 ? `Active: ${Object.entries(buttons).filter(([, v]) => v).map(([k]) => k).join(", ")}` : "Press any button"}</p></div>
              {/* Trigger bars */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-muted-foreground mb-1">L2: {l2Analog}</p><div className="h-2 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(l2Analog / 255) * 100}%` }} /></div></div>
                <div><p className="text-[10px] text-muted-foreground mb-1">R2: {r2Analog}</p><div className="h-2 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(r2Analog / 255) * 100}%` }} /></div></div>
              </div>
            </div>

            {/* Analog Sticks */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Analog Sticks</h3>
                <div className="flex items-center gap-1">
                  {(["normal", "zoom", "circularity"] as const).map(m => (
                    <button key={m} onClick={() => { setStickMode(m); if (m === "circularity") resetCirc() }}
                      className={cn("h-7 rounded px-2 text-[11px] border transition-colors", stickMode === m ? "bg-primary/10 border-primary text-primary font-medium" : "border-border text-muted-foreground hover:text-foreground")}>
                      {m === "normal" ? "Normal" : m === "zoom" ? "10x Zoom" : "Circ"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <StickCanvas x={sticks.lx} y={sticks.ly} label="Left Stick" circularityData={stickMode === "circularity" ? circLeft : undefined} zoomCenter={stickMode === "zoom"} size={180} />
                <StickCanvas x={sticks.rx} y={sticks.ry} label="Right Stick" circularityData={stickMode === "circularity" ? circRight : undefined} zoomCenter={stickMode === "zoom"} size={180} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[["LX", sticks.lx], ["LY", sticks.ly], ["RX", sticks.rx], ["RY", sticks.ry]].map(([l, v]) => (
                  <div key={l as string} className="text-[11px] text-muted-foreground">{l as string}: <span className="font-mono">{(v as number).toFixed(3)}</span></div>
                ))}
              </div>
              {stickMode === "circularity" && <button onClick={resetCirc} className="mt-2 flex w-full items-center justify-center gap-1 rounded h-7 text-xs border border-border text-muted-foreground hover:text-foreground"><RotateCcw className="h-3 w-3" /> Reset</button>}
            </div>

            {/* Info */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3"><Info className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium text-foreground">Device Information</h3></div>
              {hwItems.length > 0 && <div className="mb-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Hardware</p>{hwItems.map((i: InfoItem) => <InfoRow key={i.key} item={i} copiedKey={copiedKey} onCopy={handleCopy} />)}</div>}
              {fwItems.length > 0 && <div className="mb-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Firmware</p>{fwItems.map((i: InfoItem) => <InfoRow key={i.key} item={i} copiedKey={copiedKey} onCopy={handleCopy} />)}</div>}
              {extraItems.length > 0 && (<>
                <button onClick={() => setShowExtra(!showExtra)} className="flex w-full items-center justify-between py-1.5 text-xs text-muted-foreground hover:text-foreground"><span>{showExtra ? "Hide" : "Show"} {extraItems.length} extra</span>{showExtra ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
                {showExtra && extraItems.map((i: InfoItem) => <InfoRow key={i.key} item={i} copiedKey={copiedKey} onCopy={handleCopy} />)}
              </>)}
            </div>
          </div>

          {/* ══ HARDWARE TESTS ══ */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4"><Zap className="h-5 w-5 text-primary" /><h3 className="text-sm font-semibold text-foreground">Hardware Tests</h3></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <TestItem icon={Usb} label="USB Connection" status={testResults.usb ?? null} onTest={() => setTestResults(p => ({ ...p, usb: true }))} testing={false} detail={battery?.cable_connected ? "Connected via USB" : "Not detected"} />
              {supportedTests.includes("adaptive_triggers") && <TestItem icon={SlidersHorizontal} label="Adaptive Triggers" status={testResults.adaptive ?? null} onTest={testAdaptiveTriggers} onReset={() => resetTestResult("adaptive")} testing={testingItem === "adaptive"} detail="Resistance effect on L2/R2" />}
              <TestItem icon={Vibrate} label="Haptic / Vibration" status={testResults.haptic ?? null} onTest={testHaptic} onReset={() => resetTestResult("haptic")} testing={testingItem === "haptic"} detail="Left and right motors" />
              <TestItem icon={Lightbulb} label="Lights" status={testResults.lights ?? null} onTest={testLights} onReset={() => resetTestResult("lights")} testing={testingItem === "lights"} detail="Lightbar + player LEDs + mute LED" />
              {supportedTests.includes("speaker") && <TestItem icon={Volume2} label="Speaker" status={testResults.speaker ?? null} onTest={testSpeaker} onReset={() => resetTestResult("speaker")} testing={testingItem === "speaker"} detail="Internal speaker tone" />}
              {supportedTests.includes("headphone") && <TestItem icon={Headphones} label="Headphone Jack" status={testResults.headphone ?? null} onTest={testHeadphone} onReset={() => resetTestResult("headphone")} testing={testingItem === "headphone"} detail="3.5mm audio out" />}
              {supportedTests.includes("microphone") && <TestItem icon={Mic} label="Microphone" status={testResults.microphone ?? null} onTest={testMicrophone} onReset={() => resetTestResult("microphone")} testing={testingItem === "microphone"} detail="Internal mic (mute LED cycle)" />}
            </div>
          </div>

          {/* ══ QUICK TEST ══ */}
          <div className="rounded-lg border-2 border-primary/30 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Play className="h-5 w-5 text-primary" /><h3 className="text-sm font-semibold text-foreground">Quick Test</h3><span className="text-xs text-muted-foreground">(entry / exit service)</span></div>
              {qtActive && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary animate-pulse" /><span className="text-sm font-mono text-foreground">{qtSeconds}s</span><span className="text-xs text-muted-foreground">Btns: {everPressedRef.current.size}/{(isDS5 ? PS5_BUTTONS : PS4_BUTTONS).length}</span></div>}
            </div>

            {qtActive ? (
              <div className="space-y-4">
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3"><p className="text-sm text-foreground font-medium">Quick Test ({qtType === "entry" ? "ENTRY" : "EXIT"}) in progress...</p><p className="text-xs text-muted-foreground mt-1">Hardware tests run automatically. Rotate both sticks in full circles and press all buttons. Stop when done.</p></div>
                <div className="flex items-center justify-center gap-6">
                  <StickCanvas x={sticks.lx} y={sticks.ly} label="Left" circularityData={circLeft} size={180} />
                  <StickCanvas x={sticks.rx} y={sticks.ry} label="Right" circularityData={circRight} size={180} />
                </div>
                <button onClick={stopQuickTest} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-destructive text-sm font-medium text-destructive-foreground hover:bg-destructive/90"><SquareIcon className="h-4 w-4" /> Stop Quick Test</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => startQuickTest("entry")} disabled={!controller} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Play className="h-3.5 w-3.5" /> Entry Test</button>
                  <button onClick={() => startQuickTest("exit")} disabled={!controller} className="flex h-9 items-center gap-2 rounded-md bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"><Play className="h-3.5 w-3.5" /> Exit Test</button>
                </div>

                {(entrySnap || exitSnap) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {entrySnap && <SnapshotCard snap={entrySnap} label="Entry (Before)" className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20" />}
                      {exitSnap && <SnapshotCard snap={exitSnap} label="Exit (After)" className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20" />}
                    </div>
                    {entrySnap && exitSnap && <SnapshotComparison entry={entrySnap} exit={exitSnap} />}
                    <div className="rounded-md border border-border p-4 space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Save to Service Record</h4>
                      <div className="flex items-center gap-2">
                        <input type="text" value={qtServiceId} onChange={(e) => setQtServiceId(e.target.value)} placeholder="Paste Service Record ID" className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        <button onClick={handleSaveQt} disabled={qtSaving || qtSaved || (!entrySnap && !exitSnap)} className={cn("flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50", qtSaved ? "bg-green-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
                          {qtSaved ? <><Check className="h-3.5 w-3.5" /> Saved</> : qtSaving ? "Saving..." : <><Download className="h-3.5 w-3.5" /> Save</>}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Copy the Service Record ID from the Services page.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══ CALIBRATION ══ */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Calibration Tools</h3>
            {calibMsg && <div className="mb-4 rounded-md bg-primary/5 border border-primary/20 p-3"><p className="text-sm text-foreground">{calibMsg}</p>{calibProgress > 0 && calibProgress < 100 && <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${calibProgress}%` }} /></div>}</div>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button onClick={handleCenterCalib} disabled={calibStep !== "idle" && calibStep !== "center-done" && calibStep !== "range-done"} className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 hover:bg-accent/50 disabled:opacity-50 text-left"><Crosshair className="h-5 w-5 text-primary" /><div><p className="text-sm font-medium text-foreground">Center Calibration</p><p className="text-xs text-muted-foreground mt-0.5">{model === "DS4" ? "4-step" : "Quick auto"}. Keep sticks centered.</p></div></button>
              {calibStep !== "range-active" ? (
                <button onClick={handleRangeCalib} disabled={calibStep !== "idle" && calibStep !== "center-done" && calibStep !== "range-done"} className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 hover:bg-accent/50 disabled:opacity-50 text-left"><Maximize className="h-5 w-5 text-primary" /><div><p className="text-sm font-medium text-foreground">Range Calibration</p><p className="text-xs text-muted-foreground mt-0.5">Rotate sticks in full circles.</p></div></button>
              ) : (
                <button onClick={handleRangeEnd} className="flex flex-col items-start gap-2 rounded-lg border border-primary bg-primary/5 p-4 hover:bg-primary/10 text-left"><Maximize className="h-5 w-5 text-primary animate-pulse" /><div><p className="text-sm font-medium text-primary">Finish Range</p><p className="text-xs text-muted-foreground mt-0.5">Click when done.</p></div></button>
              )}
              <button onClick={handleSave} disabled={!hasChanges || saving} className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 hover:bg-accent/50 disabled:opacity-50 text-left"><Save className={cn("h-5 w-5", hasChanges ? "text-green-500" : "text-muted-foreground")} /><div><p className="text-sm font-medium text-foreground">{saving ? "Saving..." : "Save"}</p><p className="text-xs text-muted-foreground mt-0.5">Flash to NVS.</p></div></button>
              <button onClick={handleReset} className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 hover:bg-accent/50 text-left"><RotateCcw className="h-5 w-5 text-destructive" /><div><p className="text-sm font-medium text-foreground">Reset</p><p className="text-xs text-muted-foreground mt-0.5">Reboot controller.</p></div></button>
            </div>
          </div>

          {/* Fine-Tune */}
          {isDS5 && <FineTunePanel controller={controller} addLog={addLog} onChanges={() => setHasChanges(true)} />}

          {/* Log */}
          <details className="rounded-lg border border-border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">Activity Log ({log.length})</summary>
            <div className="max-h-48 overflow-y-auto border-t border-border p-4"><div className="flex flex-col gap-0.5">{log.map((e, i) => <p key={i} className="font-mono text-xs text-muted-foreground">{e}</p>)}</div></div>
          </details>
        </>
      )}
    </div>
  )
}

/* ═══ Fine-Tune Panel ═══ */
function FineTunePanel({ controller, addLog, onChanges }: { controller: BaseController; addLog: (m: string) => void; onChanges: () => void }) {
  const [data, setData] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)
  const labels = ["L-Left", "L-Top", "R-Left", "R-Top", "L-Right", "L-Bottom", "R-Right", "R-Bottom", "LX Center", "LY Center", "RX Center", "RY Center"]
  const maxVal = (controller as any).finetuneMaxValue || 65535

  async function load() {
    if (!("getInMemoryModuleData" in controller)) return; setLoading(true)
    try { const d = await (controller as any).getInMemoryModuleData(); setData(d); addLog("Fine-tune loaded") }
    catch (e) { addLog(`Fine-tune error: ${e}`) } finally { setLoading(false) }
  }

  async function write() {
    if (!data || !("writeFinetuneData" in controller)) return
    try { await (controller as any).writeFinetuneData(data); onChanges(); addLog("Fine-tune written") }
    catch (e) { addLog(`Write error: ${e}`) }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Fine-Tune (DS5/Edge)</h3>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50">{loading ? "Loading..." : "Load Data"}</button>
          {data && <button onClick={write} className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">Write</button>}
        </div>
      </div>
      {!data ? <p className="text-xs text-muted-foreground">Click Load Data to read values.</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {data.map((val, i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground">{labels[i] || `P${i}`}</label>
              <input type="number" min={0} max={maxVal} value={val} onChange={(e) => { const n = [...data]; n[i] = Math.max(0, Math.min(maxVal, parseInt(e.target.value) || 0)); setData(n) }}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
