"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import Link from "next/link"
import { Plus, Search, Pencil, Trash2, Laptop, Gamepad2, Usb, RefreshCw, Wrench } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { createDevice, updateDevice, deleteDevice } from "../actions"
import type { Device } from "@/lib/types"
import { DEVICE_TYPE_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const labelClass = "text-sm font-medium text-foreground"
const btnPrimary =
  "flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
const btnOutline =
  "flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"

interface DetectedController {
  index: number
  id: string
  brand: string
  model: string
  type: "playstation_controller" | "other_controller"
  axes: number
  buttons: number
  connected: boolean
}

const PS_PATTERNS: { regex: RegExp; brand: string; model: string }[] = [
  { regex: /054c.*0ce6/i, brand: "Sony", model: "DualSense (PS5)" },
  { regex: /054c.*0df2/i, brand: "Sony", model: "DualSense Edge (PS5)" },
  { regex: /054c.*09cc/i, brand: "Sony", model: "DualShock 4 v2 (PS4)" },
  { regex: /054c.*05c4/i, brand: "Sony", model: "DualShock 4 v1 (PS4)" },
  { regex: /054c.*0ba0/i, brand: "Sony", model: "PS VR2 Sense Controller" },
  { regex: /dualsense/i, brand: "Sony", model: "DualSense (PS5)" },
  { regex: /dualshock\s*4/i, brand: "Sony", model: "DualShock 4 (PS4)" },
  { regex: /wireless\s*controller.*054c/i, brand: "Sony", model: "PlayStation Controller" },
  { regex: /sony/i, brand: "Sony", model: "PlayStation Controller" },
]

function identifyController(gamepad: Gamepad): DetectedController {
  const id = gamepad.id
  let brand = "Unknown"
  let model = id.slice(0, 50)
  let type: "playstation_controller" | "other_controller" = "other_controller"

  for (const pat of PS_PATTERNS) {
    if (pat.regex.test(id)) {
      brand = pat.brand
      model = pat.model
      type = "playstation_controller"
      break
    }
  }

  // Fallback: check for known vendor IDs
  if (type === "other_controller") {
    if (/xbox|microsoft|045e/i.test(id)) {
      brand = "Microsoft"
      model = "Xbox Controller"
    } else if (/nintendo|057e/i.test(id)) {
      brand = "Nintendo"
      model = "Nintendo Controller"
    }
  }

  return {
    index: gamepad.index,
    id,
    brand,
    model,
    type,
    axes: gamepad.axes.length,
    buttons: gamepad.buttons.length,
    connected: gamepad.connected,
  }
}

function ControllerDetector({
  onSelect,
}: {
  onSelect: (ctrl: DetectedController) => void
}) {
  const [controllers, setControllers] = useState<DetectedController[]>([])
  const [scanning, setScanning] = useState(false)

  const scan = useCallback(() => {
    setScanning(true)
    const gamepads = navigator.getGamepads()
    const found: DetectedController[] = []
    for (const gp of gamepads) {
      if (gp && gp.connected) {
        found.push(identifyController(gp))
      }
    }
    setControllers(found)
    setTimeout(() => setScanning(false), 500)
  }, [])

  useEffect(() => {
    scan()

    function onConnect() { scan() }
    function onDisconnect() { scan() }

    window.addEventListener("gamepadconnected", onConnect)
    window.addEventListener("gamepaddisconnected", onDisconnect)

    // Poll every 2s for controllers (some browsers require polling)
    const interval = setInterval(scan, 2000)

    return () => {
      window.removeEventListener("gamepadconnected", onConnect)
      window.removeEventListener("gamepaddisconnected", onDisconnect)
      clearInterval(interval)
    }
  }, [scan])

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Usb className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">USB Controller Detection</span>
        </div>
        <button type="button" onClick={scan} className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <RefreshCw className={cn("h-3 w-3", scanning && "animate-spin")} />
          Scan
        </button>
      </div>

      {controllers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Connect a PS5/PS4 controller via USB and press any button to detect it. Make sure to allow gamepad access in your browser.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {controllers.map(ctrl => (
            <div key={ctrl.index} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
              <Gamepad2 className={cn("h-5 w-5 shrink-0", ctrl.type === "playstation_controller" ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ctrl.brand} {ctrl.model}</p>
                <p className="text-xs text-muted-foreground">{ctrl.buttons} buttons, {ctrl.axes} axes</p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(ctrl)}
                className={cn(btnPrimary, "h-8 px-3 text-xs")}
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function DevicesClient({ devices, isAdmin }: { devices: Device[]; isAdmin: boolean }) {
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Device | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [prefill, setPrefill] = useState<{ brand: string; model: string; type: string } | null>(null)

  const filtered = devices.filter(
    (d) =>
      d.serial_number.toLowerCase().includes(search.toLowerCase()) ||
      (d.brand?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (d.model?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  function openNew() {
    setEditing(null)
    setPrefill(null)
    setError("")
    setModalOpen(true)
  }

  function openEdit(device: Device) {
    setEditing(device)
    setPrefill(null)
    setError("")
    setModalOpen(true)
  }

  function openFromDetection(ctrl: DetectedController) {
    setEditing(null)
    setPrefill({ brand: ctrl.brand, model: ctrl.model, type: ctrl.type })
    setError("")
    setModalOpen(true)
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateDevice(editing.id, formData)
        : await createDevice(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setModalOpen(false)
        setPrefill(null)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this device?")) return
    startTransition(async () => {
      const result = await deleteDevice(id)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Devices</h2>
          <p className="mt-1 text-sm text-muted-foreground">{devices.length} registered devices</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/devices/test" className={cn(btnOutline, "text-primary border-primary/30 hover:bg-primary/10")}>
            <Wrench className="h-4 w-4" /> Test & Calibrate
          </Link>
          <button onClick={openNew} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Add Device
          </button>
        </div>
      </div>

      {/* USB auto-detect */}
      <ControllerDetector onSelect={openFromDetection} />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search serial, brand, model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(inputClass, "pl-9")}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Laptop className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">No devices found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {devices.length === 0 ? "Connect a controller via USB or add one manually." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Serial Number</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Brand</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Model</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Added</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((device) => (
                <tr key={device.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-medium text-foreground">{device.serial_number}</td>
                  <td className="px-4 py-3 text-foreground">
                    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {DEVICE_TYPE_LABELS[device.device_type] ?? device.device_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{device.brand ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{device.model ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(device.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(device)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(device.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Device" : prefill ? `Add Detected: ${prefill.brand} ${prefill.model}` : "Add Device"}>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">{error}</div>}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Serial Number</label>
            <input name="serial_number" required defaultValue={editing?.serial_number ?? ""} className={inputClass} placeholder="e.g. DS5-2025-001" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Device Type</label>
            <select name="device_type" required defaultValue={editing?.device_type ?? prefill?.type ?? "playstation_controller"} className={inputClass}>
              <option value="playstation_controller">PlayStation Controller</option>
              <option value="other_controller">Other Controller</option>
              <option value="console">Console</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Brand</label>
              <input name="brand" defaultValue={editing?.brand ?? prefill?.brand ?? ""} className={inputClass} placeholder="Sony" />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Model</label>
              <input name="model" defaultValue={editing?.model ?? prefill?.model ?? ""} className={inputClass} placeholder="DualSense" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Notes</label>
            <textarea name="notes" defaultValue={editing?.notes ?? ""} rows={3} className={cn(inputClass, "h-auto resize-none")} placeholder="Optional notes..." />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnOutline}>Cancel</button>
            <button type="submit" disabled={isPending} className={btnPrimary}>
              {isPending ? "Saving..." : editing ? "Update" : "Add Device"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
