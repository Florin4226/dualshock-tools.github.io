"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Usb, ArrowLeft, Battery, BatteryCharging, Info, Crosshair,
  Maximize, Save, RotateCcw, ChevronDown, ChevronUp, Copy, Check,
  AlertTriangle, Gamepad2, Plus, Play, Square, Download, Clock
} from "lucide-react"
import { StickCanvas } from "@/components/controller/stick-canvas"
import { createControllerInstance, SUPPORTED_DEVICES, getDeviceName, getDeviceModel } from "@/lib/controller/controller-factory"
import { sleep, CIRCULARITY_DATA_SIZE, calculateCircularityError } from "@/lib/controller/utils"
import type { BaseController } from "@/lib/controller/base-controller"
import type { ControllerInfo, NvStatus, BatteryStatus, StickData, InfoItem } from "@/lib/controller/utils"
import { cn } from "@/lib/utils"
import { saveQuickTestData } from "../../actions"

// PS button definitions
const PS_BUTTON_GROUPS = {
  face: ["triangle", "circle", "cross", "square"],
  shoulder: ["l1", "r1", "l2", "r2"],
  dpad: ["up", "down", "left", "right"],
  center: ["create", "options", "ps", "touchpad", "mute"],
  stick: ["l3", "r3"],
}

const PS_BUTTON_COLORS: Record<string, string> = {
  triangle: "#00d49b",
  circle: "#ff6467",
  cross: "#6eaaff",
  square: "#f49ec4",
}

const PS_BUTTON_SYMBOLS: Record<string, string> = {
  triangle: "\u25B3",
  circle: "\u25CB",
  cross: "\u2715",
  square: "\u25A1",
  l1: "L1", r1: "R1", l2: "L2", r2: "R2",
  up: "\u25B2", down: "\u25BC", left: "\u25C0", right: "\u25B6",
  create: "Create", options: "Options", share: "Share",
  ps: "PS", touchpad: "Touch", mute: "Mute",
  l3: "L3", r3: "R3",
}

const ALL_BUTTONS = [
  ...PS_BUTTON_GROUPS.face,
  ...PS_BUTTON_GROUPS.shoulder,
  ...PS_BUTTON_GROUPS.dpad,
  ...PS_BUTTON_GROUPS.center,
  ...PS_BUTTON_GROUPS.stick,
]

type CalibStep = "idle" | "center-begin" | "center-sampling" | "center-done" | "range-active" | "range-done"

/* --- Quick Test snapshot type --- */
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
  stickCenterLX: number
  stickCenterLY: number
  stickCenterRX: number
  stickCenterRY: number
}

/* --- PS-style button indicator --- */
function PSButton({ name, active }: { name: string; active: boolean }) {
  const isFace = PS_BUTTON_COLORS[name] !== undefined
  const symbol = PS_BUTTON_SYMBOLS[name] || name
  const faceColor = PS_BUTTON_COLORS[name]

  if (isFace) {
    return (
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-bold transition-all",
        active ? "scale-110 shadow-lg" : "opacity-40"
      )} style={{
        borderColor: faceColor,
        backgroundColor: active ? faceColor : "transparent",
        color: active ? "#fff" : faceColor,
      }}>
        {symbol}
      </div>
    )
  }

  const isDpad = ["up", "down", "left", "right"].includes(name)
  const isShoulder = ["l1", "r1", "l2", "r2"].includes(name)

  return (
    <div className={cn(
      "flex items-center justify-center text-xs font-semibold uppercase transition-all border",
      isDpad ? "h-8 w-8 rounded" : isShoulder ? "h-7 rounded-md px-2.5" : "h-7 rounded-full px-2.5",
      active
        ? "bg-foreground text-background border-foreground scale-105"
        : "bg-transparent text-muted-foreground/50 border-muted-foreground/20"
    )}>
      {symbol}
    </div>
  )
}

/* --- Info Row --- */
function InfoRow({ item, copiedKey, onCopy }: { item: InfoItem; copiedKey: string | null; onCopy: (key: string, value: string) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
      <span className="text-xs text-muted-foreground">{item.key}</span>
      <div className="flex items-center gap-1.5">
        <span className={cn("text-xs font-mono", item.severity === "danger" ? "text-destructive" : "text-foreground")}>
          {item.value}
        </span>
        {item.copyable && (
          <button type="button" onClick={() => onCopy(item.key, item.value)}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={`Copy ${item.key}`}>
            {copiedKey === item.key ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  )
}

/* --- Quick Test Snapshot Comparison --- */
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
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Circularity L</span><span className={cn("font-mono font-medium", snap.circularityErrorLeft < 5 ? "text-green-600" : snap.circularityErrorLeft < 15 ? "text-yellow-600" : "text-red-600")}>{snap.circularityErrorLeft.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Circularity R</span><span className={cn("font-mono font-medium", snap.circularityErrorRight < 5 ? "text-green-600" : snap.circularityErrorRight < 15 ? "text-yellow-600" : "text-red-600")}>{snap.circularityErrorRight.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Center LX/LY</span><span className="font-mono">{snap.stickCenterLX.toFixed(3)} / {snap.stickCenterLY.toFixed(3)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Center RX/RY</span><span className="font-mono">{snap.stickCenterRX.toFixed(3)} / {snap.stickCenterRY.toFixed(3)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Buttons</span><span className={cn("font-medium", snap.allButtonsOk ? "text-green-600" : "text-yellow-600")}>{snap.buttonsTestedCount}/{snap.totalButtons} {snap.allButtonsOk ? "OK" : "Incomplete"}</span></div>
      </div>
    </div>
  )
}

function SnapshotComparison({ entry, exit }: { entry: QuickTestSnapshot; exit: QuickTestSnapshot }) {
  const circLDiff = exit.circularityErrorLeft - entry.circularityErrorLeft
  const circRDiff = exit.circularityErrorRight - entry.circularityErrorRight
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mt-3">
      <h4 className="text-sm font-semibold text-foreground mb-3">Comparison (Entry vs Exit)</h4>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Circularity L</span>
          <span className={cn("font-mono font-medium", circLDiff < 0 ? "text-green-600" : circLDiff > 0 ? "text-red-600" : "text-muted-foreground")}>
            {circLDiff > 0 ? "+" : ""}{circLDiff.toFixed(1)}% ({circLDiff < 0 ? "improved" : circLDiff > 0 ? "degraded" : "same"})
          </span>
        </div>
        <div className="flex justify-between"><span className="text-muted-foreground">Circularity R</span>
          <span className={cn("font-mono font-medium", circRDiff < 0 ? "text-green-600" : circRDiff > 0 ? "text-red-600" : "text-muted-foreground")}>
            {circRDiff > 0 ? "+" : ""}{circRDiff.toFixed(1)}% ({circRDiff < 0 ? "improved" : circRDiff > 0 ? "degraded" : "same"})
          </span>
        </div>
      </div>
    </div>
  )
}

/* ============ Main Page ============ */
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

  // Circularity
  const llDataRef = useRef<number[]>(new Array(CIRCULARITY_DATA_SIZE).fill(0))
  const rrDataRef = useRef<number[]>(new Array(CIRCULARITY_DATA_SIZE).fill(0))
  const [circLeft, setCircLeft] = useState<number[]>([])
  const [circRight, setCircRight] = useState<number[]>([])
  const [stickMode, setStickMode] = useState<"normal" | "zoom" | "circularity">("normal")

  // Quick Test
  const [quickTestActive, setQuickTestActive] = useState(false)
  const [quickTestType, setQuickTestType] = useState<"entry" | "exit">("entry")
  const [quickTestSeconds, setQuickTestSeconds] = useState(0)
  const quickTestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const everPressedRef = useRef<Set<string>>(new Set())
  const [entrySnapshot, setEntrySnapshot] = useState<QuickTestSnapshot | null>(null)
  const [exitSnapshot, setExitSnapshot] = useState<QuickTestSnapshot | null>(null)
  const [quickTestServiceId, setQuickTestServiceId] = useState("")
  const [savingQuickTest, setSavingQuickTest] = useState(false)
  const [quickTestSaved, setQuickTestSaved] = useState(false)

  // Center readings for quick test
  const centerReadingsRef = useRef<{ lx: number[]; ly: number[]; rx: number[]; ry: number[] }>({ lx: [], ly: [], rx: [], ry: [] })

  const controllerRef = useRef<BaseController | null>(null)

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  // Check WebHID support
  useEffect(() => { setSupported("hid" in navigator) }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.close()
      if (quickTestTimerRef.current) clearInterval(quickTestTimerRef.current)
    }
  }, [])

  // Track which buttons were ever pressed during quick test
  useEffect(() => {
    if (!quickTestActive) return
    Object.entries(buttons).forEach(([k, v]) => {
      if (v) everPressedRef.current.add(k)
    })
  }, [buttons, quickTestActive])

  // Collect center readings during quick test (first 2 seconds)
  useEffect(() => {
    if (!quickTestActive || quickTestSeconds > 2) return
    centerReadingsRef.current.lx.push(sticks.lx)
    centerReadingsRef.current.ly.push(sticks.ly)
    centerReadingsRef.current.rx.push(sticks.rx)
    centerReadingsRef.current.ry.push(sticks.ry)
  }, [quickTestActive, quickTestSeconds, sticks])

  // Input report handling -- 60fps via requestAnimationFrame
  useEffect(() => {
    if (!controller) return
    const device = controller.device
    let latestData: DataView | null = null

    const onReport = (event: HIDInputReportEvent) => { latestData = event.data }
    device.addEventListener("inputreport", onReport)

    let raf: number
    const loop = () => {
      if (latestData && latestData.byteLength >= 10) {
        try {
          const parsed = controller.parseInput(latestData)
          setSticks(parsed.sticks)
          setButtons(parsed.buttons)
          setBattery(parsed.battery)

          // Update circularity data
          const { lx, ly, rx, ry } = parsed.sticks
          const lDist = Math.sqrt(lx * lx + ly * ly)
          const rDist = Math.sqrt(rx * rx + ry * ry)
          if (lDist > 0.3) {
            const angle = Math.atan2(ly, lx)
            const idx = Math.round(((angle + Math.PI) / (2 * Math.PI)) * CIRCULARITY_DATA_SIZE) % CIRCULARITY_DATA_SIZE
            llDataRef.current[idx] = lDist
          }
          if (rDist > 0.3) {
            const angle = Math.atan2(ry, rx)
            const idx = Math.round(((angle + Math.PI) / (2 * Math.PI)) * CIRCULARITY_DATA_SIZE) % CIRCULARITY_DATA_SIZE
            rrDataRef.current[idx] = rDist
          }
          setCircLeft([...llDataRef.current])
          setCircRight([...rrDataRef.current])
        } catch { /* skip bad frame */ }
        latestData = null
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      device.removeEventListener("inputreport", onReport)
      cancelAnimationFrame(raf)
    }
  }, [controller])

  /* ---- Connection ---- */
  async function handleConnect() {
    if (!("hid" in navigator)) return
    setConnecting(true)
    setError("")
    try {
      let devices = await (navigator as Navigator & { hid: { getDevices(): Promise<HIDDevice[]>; requestDevice(opts: { filters: Array<{ vendorId: number; productId: number }> }): Promise<HIDDevice[]> } }).hid.getDevices()
      if (devices.length === 0) {
        devices = await (navigator as Navigator & { hid: { requestDevice(opts: { filters: Array<{ vendorId: number; productId: number }> }): Promise<HIDDevice[]> } }).hid.requestDevice({ filters: SUPPORTED_DEVICES })
      }
      if (devices.length === 0) { setConnecting(false); return }
      const device: HIDDevice = devices[0]
      if (device.opened) { await device.close(); await sleep(500) }
      await device.open()

      addLog(`Connected to ${device.productName || "device"} (${device.vendorId}:${device.productId})`)

      const ctrl = createControllerInstance(device)
      controllerRef.current = ctrl
      setController(ctrl)
      setDeviceName(getDeviceName(device.productId))

      addLog("Fetching controller info...")
      const controllerInfo = await ctrl.getInfo()
      setInfo(controllerInfo)
      setNvStatus(controllerInfo.nv || null)

      if (controllerInfo.ok) {
        addLog("Controller info OK")
        const sn = await ctrl.getSerialNumber()
        setSerialNumber(sn)
        addLog(`Serial: ${sn}`)
      } else {
        addLog("Failed to get controller info")
        setError("Failed to read controller info. Device may not be genuine or not connected via USB.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed"
      setError(msg)
      addLog(`Error: ${msg}`)
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (controllerRef.current) { await controllerRef.current.close(); controllerRef.current = null }
    setController(null); setInfo(null); setSerialNumber(""); setDeviceName("")
    setSticks({ lx: 0, ly: 0, rx: 0, ry: 0 }); setButtons({}); setBattery(null)
    setNvStatus(null); setCalibStep("idle"); setHasChanges(false)
    llDataRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0)
    rrDataRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0)
    setCircLeft([]); setCircRight([])
    addLog("Disconnected")
  }

  /* ---- Add to Devices with serial number auto-fill ---- */
  function handleAddToDevices() {
    const params = new URLSearchParams({
      add: "1",
      serial: serialNumber,
      brand: "Sony",
      model: deviceName,
      type: "playstation_controller",
    })
    router.push(`/dashboard/devices?${params.toString()}`)
  }

  /* ---- Quick Test ---- */
  function startQuickTest(type: "entry" | "exit") {
    // Reset circularity data for fresh test
    llDataRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0)
    rrDataRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0)
    setCircLeft([]); setCircRight([])
    everPressedRef.current = new Set()
    centerReadingsRef.current = { lx: [], ly: [], rx: [], ry: [] }
    setStickMode("circularity")
    setQuickTestActive(true)
    setQuickTestType(type)
    setQuickTestSeconds(0)
    setQuickTestSaved(false)
    addLog(`Quick Test (${type}) started. Rotate both sticks and press all buttons.`)

    quickTestTimerRef.current = setInterval(() => {
      setQuickTestSeconds(prev => prev + 1)
    }, 1000)
  }

  function stopQuickTest() {
    if (quickTestTimerRef.current) { clearInterval(quickTestTimerRef.current); quickTestTimerRef.current = null }
    setQuickTestActive(false)

    // Calculate averages for center readings
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const centerLX = avg(centerReadingsRef.current.lx)
    const centerLY = avg(centerReadingsRef.current.ly)
    const centerRX = avg(centerReadingsRef.current.rx)
    const centerRY = avg(centerReadingsRef.current.ry)

    const snapshot: QuickTestSnapshot = {
      timestamp: new Date().toISOString(),
      circularityLeft: [...llDataRef.current],
      circularityRight: [...rrDataRef.current],
      circularityErrorLeft: calculateCircularityError(llDataRef.current),
      circularityErrorRight: calculateCircularityError(rrDataRef.current),
      buttonsTestedCount: everPressedRef.current.size,
      totalButtons: ALL_BUTTONS.length,
      allButtonsOk: everPressedRef.current.size >= ALL_BUTTONS.length - 2, // allow 2 missing (mute/touchpad)
      deviceName,
      serialNumber,
      stickCenterLX: centerLX,
      stickCenterLY: centerLY,
      stickCenterRX: centerRX,
      stickCenterRY: centerRY,
    }

    if (quickTestType === "entry") {
      setEntrySnapshot(snapshot)
      addLog(`Entry Quick Test complete. Circularity: L=${snapshot.circularityErrorLeft.toFixed(1)}% R=${snapshot.circularityErrorRight.toFixed(1)}%, Buttons: ${snapshot.buttonsTestedCount}/${snapshot.totalButtons}`)
    } else {
      setExitSnapshot(snapshot)
      addLog(`Exit Quick Test complete. Circularity: L=${snapshot.circularityErrorLeft.toFixed(1)}% R=${snapshot.circularityErrorRight.toFixed(1)}%, Buttons: ${snapshot.buttonsTestedCount}/${snapshot.totalButtons}`)
    }
  }

  async function handleSaveQuickTest() {
    if (!quickTestServiceId.trim()) {
      setError("Please enter a Service Record ID to save the Quick Test data.")
      return
    }
    setSavingQuickTest(true)
    try {
      const data: Record<string, unknown> = {}
      if (entrySnapshot) data.entry = entrySnapshot
      if (exitSnapshot) data.exit = exitSnapshot
      const result = await saveQuickTestData(quickTestServiceId, data)
      if (result.error) {
        setError(result.error)
      } else {
        setQuickTestSaved(true)
        addLog(`Quick Test data saved to service record ${quickTestServiceId}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed"
      setError(msg)
    } finally {
      setSavingQuickTest(false)
    }
  }

  /* ---- Calibration ---- */
  async function handleCenterCalibration() {
    if (!controller) return
    setCalibStep("center-begin"); setCalibMsg("Starting center calibration..."); setCalibProgress(10)
    try {
      const res = await controller.calibrateSticksBegin()
      if (!res.ok) throw new Error(String(res.error || "Begin failed"))
      setCalibStep("center-sampling"); setCalibProgress(30)
      addLog("Center calibration started. Keep sticks centered!")

      for (let i = 0; i < 5; i++) {
        await sleep(500)
        const sr = await controller.calibrateSticksSample()
        if (!sr.ok) throw new Error(String(sr.error || "Sample failed"))
        setCalibProgress(30 + ((i + 1) / 5) * 50)
        setCalibMsg(`Sampling... (${i + 1}/5)`)
      }

      const er = await controller.calibrateSticksEnd()
      if (!er.ok) throw new Error(String(er.error || "End failed"))
      setCalibStep("center-done"); setCalibProgress(100)
      setCalibMsg("Center calibration complete! Save changes to flash.")
      setHasChanges(true)
      addLog("Center calibration complete")
    } catch (err: unknown) {
      setCalibStep("idle"); setCalibMsg("")
      const msg = err instanceof Error ? err.message : "Calibration failed"
      setError(msg)
      addLog(`Center calibration error: ${msg}`)
    }
  }

  async function handleRangeCalibration() {
    if (!controller) return
    setCalibStep("range-active"); setCalibMsg("Range calibration active. Rotate both sticks fully!"); setCalibProgress(0)
    try {
      const res = await controller.calibrateRangeBegin()
      if (!res.ok) throw new Error(String(res.error || "Range begin failed"))
      addLog("Range calibration started. Rotate both sticks in full circles!")
    } catch (err: unknown) {
      setCalibStep("idle"); setCalibMsg("")
      const msg = err instanceof Error ? err.message : "Range calibration failed to start"
      setError(msg)
      addLog(`Range calibration error: ${msg}`)
    }
  }

  async function handleRangeCalibrationEnd() {
    if (!controller) return
    try {
      const res = await controller.calibrateRangeEnd()
      if (res.ok || (res.code && [3, 4, 5].includes(res.code))) {
        setCalibStep("range-done"); setCalibProgress(100)
        setCalibMsg("Range calibration complete! Save changes to flash.")
        setHasChanges(true)
        addLog("Range calibration complete")
      } else {
        throw new Error(String(res.error || "Range end failed"))
      }
    } catch (err: unknown) {
      setCalibStep("idle"); setCalibMsg("")
      const msg = err instanceof Error ? err.message : "Range calibration failed"
      setError(msg)
      addLog(`Range end error: ${msg}`)
    }
  }

  async function handleSave() {
    if (!controller) return
    setSaving(true)
    try {
      const res = await controller.flash()
      addLog(res.message)
      setHasChanges(false); setCalibStep("idle"); setCalibMsg("Saved!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed"
      setError(msg)
      addLog(`Save error: ${msg}`)
    } finally { setSaving(false) }
  }

  async function handleReset() {
    if (!controller) return
    try {
      await controller.reset()
      addLog("Controller reset. Reconnect.")
      await handleDisconnect()
    } catch (err: unknown) { addLog(`Reset error: ${err instanceof Error ? err.message : "Unknown"}`) }
  }

  function handleCopy(key: string, value: string) {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function resetCircularity() {
    llDataRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0)
    rrDataRef.current = new Array(CIRCULARITY_DATA_SIZE).fill(0)
    setCircLeft([]); setCircRight([])
    addLog("Circularity data reset")
  }

  if (supported === null) return null

  if (!supported) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">WebHID Not Supported</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Your browser does not support WebHID. Use Google Chrome or Microsoft Edge on desktop to test PS controllers via USB.
        </p>
        <Link href="/dashboard/devices" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Devices
        </Link>
      </div>
    )
  }

  const hwItems = info?.infoItems?.filter((i: InfoItem) => i.cat === "hw" && !i.isExtra) || []
  const fwItems = info?.infoItems?.filter((i: InfoItem) => i.cat === "fw" && !i.isExtra) || []
  const extraItems = info?.infoItems?.filter((i: InfoItem) => i.isExtra) || []
  const model = controller ? getDeviceModel(controller.device.productId) : ""
  const isDS5 = model === "DS5" || model === "DS5_Edge"
  const useZoom = stickMode === "zoom"
  const showCirc = stickMode === "circularity"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/devices" className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Controller Test & Calibration</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">WebHID - PS4 and PS5 controllers only (USB)</p>
          </div>
        </div>
        {!controller ? (
          <button onClick={handleConnect} disabled={connecting}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Usb className="h-4 w-4" />
            {connecting ? "Connecting..." : "Connect Controller"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {serialNumber && (
              <button onClick={handleAddToDevices}
                className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Add to Devices
              </button>
            )}
            <button onClick={handleDisconnect}
              className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent">
              Disconnect
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-destructive/60 hover:text-destructive">{"x"}</button>
        </div>
      )}

      {!controller ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center gap-4">
          <Gamepad2 className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">No controller connected</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Click &quot;Connect Controller&quot; and plug your PS4/PS5 controller via USB cable.
              Bluetooth is not supported &mdash; use a wired connection.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Status Bar */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{deviceName}</span>
              </div>
              {serialNumber && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">SN:</span>
                  <span className="font-mono text-xs text-foreground">{serialNumber}</span>
                  <button onClick={() => handleCopy("serial", serialNumber)}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground">
                    {copiedKey === "serial" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
              {battery && (
                <div className="flex items-center gap-1.5">
                  {battery.is_charging ? <BatteryCharging className="h-4 w-4 text-green-500" /> : <Battery className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground">{battery.charge_level}%</span>
                  <span className="text-xs text-muted-foreground">({battery.cable_connected ? "USB" : "Battery"})</span>
                </div>
              )}
              {nvStatus && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">NVS:</span>
                  <span className={cn("text-xs font-medium",
                    nvStatus.status === "locked" ? "text-green-500" :
                    nvStatus.status === "unlocked" ? "text-yellow-500" : "text-muted-foreground"
                  )}>
                    {nvStatus.status}
                  </span>
                </div>
              )}
              {hasChanges && (
                <span className="inline-flex rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-500 border border-yellow-500/30">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>

          {/* ========== QUICK TEST ========== */}
          <div className="rounded-lg border-2 border-primary/30 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Quick Test</h3>
                <span className="text-xs text-muted-foreground">(entry / exit service record)</span>
              </div>
              {quickTestActive && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm font-mono text-foreground">{quickTestSeconds}s</span>
                  <span className="text-xs text-muted-foreground">
                    Buttons: {everPressedRef.current.size}/{ALL_BUTTONS.length}
                  </span>
                </div>
              )}
            </div>

            {quickTestActive ? (
              <div className="space-y-4">
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                  <p className="text-sm text-foreground font-medium">
                    Quick Test ({quickTestType === "entry" ? "ENTRY" : "EXIT"}) in progress...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rotate both sticks in full circles, then press all buttons. Click &quot;Stop&quot; when done.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-6">
                  <StickCanvas x={sticks.lx} y={sticks.ly} label="Left Stick" circularityData={circLeft} size={180} />
                  <StickCanvas x={sticks.rx} y={sticks.ry} label="Right Stick" circularityData={circRight} size={180} />
                </div>
                <button onClick={stopQuickTest}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-destructive text-sm font-medium text-destructive-foreground hover:bg-destructive/90">
                  <Square className="h-4 w-4" /> Stop Quick Test
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => startQuickTest("entry")} disabled={!controller}
                    className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    <Play className="h-3.5 w-3.5" /> Entry Test
                  </button>
                  <button onClick={() => startQuickTest("exit")} disabled={!controller}
                    className="flex h-9 items-center gap-2 rounded-md bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                    <Play className="h-3.5 w-3.5" /> Exit Test
                  </button>
                </div>

                {/* Show snapshots */}
                {(entrySnapshot || exitSnapshot) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {entrySnapshot && (
                        <SnapshotCard snap={entrySnapshot} label="Entry (Before Service)" className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20" />
                      )}
                      {exitSnapshot && (
                        <SnapshotCard snap={exitSnapshot} label="Exit (After Service)" className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20" />
                      )}
                    </div>

                    {entrySnapshot && exitSnapshot && (
                      <SnapshotComparison entry={entrySnapshot} exit={exitSnapshot} />
                    )}

                    {/* Save to service record */}
                    <div className="rounded-md border border-border p-4 space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Save Quick Test to Service Record</h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={quickTestServiceId}
                          onChange={(e) => setQuickTestServiceId(e.target.value)}
                          placeholder="Paste Service Record ID here"
                          className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <button onClick={handleSaveQuickTest} disabled={savingQuickTest || quickTestSaved || (!entrySnapshot && !exitSnapshot)}
                          className={cn(
                            "flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50",
                            quickTestSaved
                              ? "bg-green-600 text-white"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          )}>
                          {quickTestSaved ? <><Check className="h-3.5 w-3.5" /> Saved</> : savingQuickTest ? "Saving..." : <><Download className="h-3.5 w-3.5" /> Save</>}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Copy the Service Record ID from the Services page and paste it here. The entry/exit test results will be attached to that record.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grid: Sticks | Buttons | Info */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* ---- Analog Sticks ---- */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Analog Sticks</h3>
                <div className="flex items-center gap-1">
                  {(["normal", "zoom", "circularity"] as const).map(m => (
                    <button key={m} onClick={() => { setStickMode(m); if (m === "circularity") resetCircularity() }}
                      className={cn("h-7 rounded px-2 text-[11px] border transition-colors",
                        stickMode === m ? "bg-primary/10 border-primary text-primary font-medium" : "border-border text-muted-foreground hover:text-foreground"
                      )}>
                      {m === "normal" ? "Normal" : m === "zoom" ? "10x Zoom" : "Circularity"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <StickCanvas x={sticks.lx} y={sticks.ly} label="Left Stick"
                  circularityData={showCirc ? circLeft : undefined}
                  zoomCenter={useZoom} size={180} />
                <StickCanvas x={sticks.rx} y={sticks.ry} label="Right Stick"
                  circularityData={showCirc ? circRight : undefined}
                  zoomCenter={useZoom} size={180} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div className="text-[11px] text-muted-foreground">LX: <span className="font-mono">{sticks.lx.toFixed(3)}</span></div>
                <div className="text-[11px] text-muted-foreground">LY: <span className="font-mono">{sticks.ly.toFixed(3)}</span></div>
                <div className="text-[11px] text-muted-foreground">RX: <span className="font-mono">{sticks.rx.toFixed(3)}</span></div>
                <div className="text-[11px] text-muted-foreground">RY: <span className="font-mono">{sticks.ry.toFixed(3)}</span></div>
              </div>
              {showCirc && (
                <button onClick={resetCircularity}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded h-7 text-xs border border-border text-muted-foreground hover:text-foreground">
                  <RotateCcw className="h-3 w-3" /> Reset circularity data
                </button>
              )}
            </div>

            {/* ---- Button Test ---- */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">Button Test</h3>

              {/* Face buttons in diamond layout */}
              <div className="flex items-center justify-center mb-4">
                <div className="grid grid-cols-3 gap-0 w-[120px]">
                  <div />
                  <div className="flex justify-center"><PSButton name="triangle" active={!!buttons.triangle} /></div>
                  <div />
                  <div className="flex justify-center"><PSButton name="square" active={!!buttons.square} /></div>
                  <div />
                  <div className="flex justify-center"><PSButton name="circle" active={!!buttons.circle} /></div>
                  <div />
                  <div className="flex justify-center"><PSButton name="cross" active={!!buttons.cross} /></div>
                  <div />
                </div>
              </div>

              {/* Shoulder */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {PS_BUTTON_GROUPS.shoulder.map(b => <PSButton key={b} name={b} active={!!buttons[b]} />)}
              </div>

              {/* D-pad in cross layout */}
              <div className="flex items-center justify-center mb-3">
                <div className="grid grid-cols-3 gap-0.5 w-[90px]">
                  <div />
                  <div className="flex justify-center"><PSButton name="up" active={!!buttons.up} /></div>
                  <div />
                  <div className="flex justify-center"><PSButton name="left" active={!!buttons.left} /></div>
                  <div />
                  <div className="flex justify-center"><PSButton name="right" active={!!buttons.right} /></div>
                  <div />
                  <div className="flex justify-center"><PSButton name="down" active={!!buttons.down} /></div>
                  <div />
                </div>
              </div>

              {/* Center + Sticks */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
                {PS_BUTTON_GROUPS.center.map(b => <PSButton key={b} name={b} active={!!buttons[b]} />)}
              </div>
              <div className="flex items-center justify-center gap-2">
                {PS_BUTTON_GROUPS.stick.map(b => <PSButton key={b} name={b} active={!!buttons[b]} />)}
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {Object.values(buttons).filter(Boolean).length > 0
                    ? `Active: ${Object.entries(buttons).filter(([, v]) => v).map(([k]) => k).join(", ")}`
                    : "Press any button to test"
                  }
                </p>
              </div>
            </div>

            {/* ---- Info ---- */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Device Information</h3>
              </div>
              {hwItems.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Hardware</p>
                  {hwItems.map((item: InfoItem) => <InfoRow key={item.key} item={item} copiedKey={copiedKey} onCopy={handleCopy} />)}
                </div>
              )}
              {fwItems.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Firmware</p>
                  {fwItems.map((item: InfoItem) => <InfoRow key={item.key} item={item} copiedKey={copiedKey} onCopy={handleCopy} />)}
                </div>
              )}
              {extraItems.length > 0 && (
                <>
                  <button onClick={() => setShowExtra(!showExtra)}
                    className="flex w-full items-center justify-between py-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <span>{showExtra ? "Hide" : "Show"} {extraItems.length} extra fields</span>
                    {showExtra ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showExtra && extraItems.map((item: InfoItem) => <InfoRow key={item.key} item={item} copiedKey={copiedKey} onCopy={handleCopy} />)}
                </>
              )}
            </div>
          </div>

          {/* ---- Calibration Tools ---- */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Calibration Tools</h3>

            {calibMsg && (
              <div className="mb-4 rounded-md bg-primary/5 border border-primary/20 p-3">
                <p className="text-sm text-foreground">{calibMsg}</p>
                {calibProgress > 0 && calibProgress < 100 && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${calibProgress}%` }} />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Center */}
              <button onClick={handleCenterCalibration}
                disabled={calibStep !== "idle" && calibStep !== "center-done" && calibStep !== "range-done"}
                className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors disabled:opacity-50 text-left">
                <Crosshair className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Center Calibration</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {model === "DS4" ? "4-step calibration" : "Quick auto-calibration"}. Keep sticks centered.
                  </p>
                </div>
              </button>

              {/* Range */}
              {calibStep !== "range-active" ? (
                <button onClick={handleRangeCalibration}
                  disabled={calibStep !== "idle" && calibStep !== "center-done" && calibStep !== "range-done"}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors disabled:opacity-50 text-left">
                  <Maximize className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Range Calibration</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Rotate both sticks in full circles to calibrate range.</p>
                  </div>
                </button>
              ) : (
                <button onClick={handleRangeCalibrationEnd}
                  className="flex flex-col items-start gap-2 rounded-lg border border-primary bg-primary/5 p-4 hover:bg-primary/10 transition-colors text-left">
                  <Maximize className="h-5 w-5 text-primary animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-primary">Finish Range Calibration</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Click when done rotating both sticks.</p>
                  </div>
                </button>
              )}

              {/* Save */}
              <button onClick={handleSave} disabled={!hasChanges || saving}
                className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors disabled:opacity-50 text-left">
                <Save className={cn("h-5 w-5", hasChanges ? "text-green-500" : "text-muted-foreground")} />
                <div>
                  <p className="text-sm font-medium text-foreground">{saving ? "Saving..." : "Save Changes"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Flash calibration data to controller NVS.</p>
                </div>
              </button>

              {/* Reset */}
              <button onClick={handleReset}
                className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors text-left">
                <RotateCcw className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">Reset Controller</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Reboot controller. Unsaved changes will be lost.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Fine-Tune (DS5/Edge only) */}
          {isDS5 && <FineTunePanel controller={controller} addLog={addLog} onChanges={() => setHasChanges(true)} />}

          {/* Activity Log */}
          <details className="rounded-lg border border-border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">Activity Log ({log.length})</summary>
            <div className="max-h-48 overflow-y-auto border-t border-border p-4">
              {log.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {log.map((entry, i) => (
                    <p key={i} className="font-mono text-xs text-muted-foreground">{entry}</p>
                  ))}
                </div>
              )}
            </div>
          </details>
        </>
      )}
    </div>
  )
}

/* ============ Fine-Tune Panel ============ */
function FineTunePanel({ controller, addLog, onChanges }: { controller: BaseController; addLog: (msg: string) => void; onChanges: () => void }) {
  const [finetuneData, setFinetuneData] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadFinetuneData() {
    if (!("getInMemoryModuleData" in controller)) return
    setLoading(true)
    try {
      const data = await (controller as Record<string, unknown> & { getInMemoryModuleData: () => Promise<number[]> }).getInMemoryModuleData()
      setFinetuneData(data)
      addLog("Fine-tune data loaded")
    } catch (err: unknown) { addLog(`Fine-tune load error: ${err instanceof Error ? err.message : "Unknown"}`) }
    finally { setLoading(false) }
  }

  async function writeFinetuneData() {
    if (!finetuneData || !("writeFinetuneData" in controller)) return
    try {
      await (controller as Record<string, unknown> & { writeFinetuneData: (d: number[]) => Promise<void> }).writeFinetuneData(finetuneData)
      onChanges()
      addLog("Fine-tune data written to controller memory")
    } catch (err: unknown) { addLog(`Fine-tune write error: ${err instanceof Error ? err.message : "Unknown"}`) }
  }

  const maxVal = (controller as Record<string, unknown>).finetuneMaxValue as number || 65535
  const labels = [
    "L-Left", "L-Top", "R-Left", "R-Top",
    "L-Right", "L-Bottom", "R-Right", "R-Bottom",
    "LX Center", "LY Center", "RX Center", "RY Center",
  ]

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Fine-Tune Stick Calibration (DS5/Edge)</h3>
        <div className="flex items-center gap-2">
          <button onClick={loadFinetuneData} disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50">
            {loading ? "Loading..." : "Load Data"}
          </button>
          {finetuneData && (
            <button onClick={writeFinetuneData}
              className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Write to Controller
            </button>
          )}
        </div>
      </div>

      {!finetuneData ? (
        <p className="text-xs text-muted-foreground">Click &quot;Load Data&quot; to read current fine-tune values from the controller.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {finetuneData.map((val, i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground">{labels[i] || `Param ${i}`}</label>
              <input type="number" min={0} max={maxVal} value={val}
                onChange={(e) => {
                  const newData = [...finetuneData]
                  newData[i] = Math.max(0, Math.min(maxVal, parseInt(e.target.value) || 0))
                  setFinetuneData(newData)
                }}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
