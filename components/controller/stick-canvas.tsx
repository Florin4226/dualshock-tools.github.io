"use client"

import { useRef, useEffect } from "react"
import { CIRCULARITY_DATA_SIZE, calculateCircularityError } from "@/lib/controller/utils"

interface StickCanvasProps {
  x: number
  y: number
  label: string
  circularityData?: number[]
  size?: number
  zoomCenter?: boolean
}

function applyCenterZoom(x: number, y: number): { x: number; y: number } {
  const distance = Math.sqrt(x * x + y * y)
  if (distance === 0) return { x, y }
  const angle = Math.atan2(y, x)
  const newDist = distance <= 0.05
    ? (distance / 0.05) * 0.5
    : 0.5 + ((distance - 0.05) / 0.95) * 0.5
  return { x: Math.cos(angle) * newDist, y: Math.sin(angle) * newDist }
}

export function StickCanvas({ x, y, label, circularityData, size = 180, zoomCenter = false }: StickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 8

    // Background circle
    ctx.fillStyle = "#1a1a2e"
    ctx.strokeStyle = "#3a3a5e"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Circularity visualization
    if (circularityData && circularityData.length > 0) {
      for (let i = 0; i < CIRCULARITY_DATA_SIZE; i++) {
        const kd = circularityData[i]
        const kd1 = circularityData[(i + 1) % CIRCULARITY_DATA_SIZE]
        if (kd === undefined || kd1 === undefined) continue
        const ka = (i * Math.PI * 2) / CIRCULARITY_DATA_SIZE
        const ka1 = (((i + 1) % CIRCULARITY_DATA_SIZE) * 2 * Math.PI) / CIRCULARITY_DATA_SIZE
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(ka) * kd * r, cy + Math.sin(ka) * kd * r)
        ctx.lineTo(cx + Math.cos(ka1) * kd1 * r, cy + Math.sin(ka1) * kd1 * r)
        ctx.closePath()
        const cc = (kd + kd1) / 2
        const dd = Math.sqrt(Math.pow(1.0 - cc, 2))
        let hh = cc <= 1.0
          ? 220 - 220 * Math.min(1.0, Math.max(0, dd - 0.05) / 0.1)
          : ((245 + ((360 - 245) * Math.min(1.0, Math.max(0, dd - 0.05) / 0.15))) % 360)
        ctx.fillStyle = `hsla(${Math.round(hh)}, 100%, 50%, 0.35)`
        ctx.fill()
      }
      const validCount = circularityData.filter(n => n > 0.3).length
      if (validCount > 10) {
        const err = calculateCircularityError(circularityData)
        ctx.fillStyle = "#fff"
        ctx.font = "bold 16px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(`${err.toFixed(1)}%`, cx, cy + r * 0.55)
      }
    }

    // Crosshairs
    ctx.strokeStyle = "#4a4a6e"
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy)
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r)
    ctx.stroke()

    // Zoom center ring
    if (zoomCenter) {
      ctx.strokeStyle = "#5a5a7e"
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.5, 0, 2 * Math.PI)
      ctx.stroke()
    }

    // Stick position
    let dx = x, dy = y
    if (zoomCenter) {
      const z = applyCenterZoom(x, y)
      dx = z.x; dy = z.y
    }

    // Line from center to dot
    ctx.strokeStyle = "#6366f1"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + dx * r, cy + dy * r)
    ctx.stroke()

    // Dot at position
    ctx.fillStyle = "#818cf8"
    ctx.beginPath()
    ctx.arc(cx + dx * r, cy + dy * r, 4, 0, 2 * Math.PI)
    ctx.fill()

    // Label
    ctx.fillStyle = "#a0a0c0"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(label, cx, size - 2)
  }, [x, y, circularityData, size, zoomCenter, label])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded-lg"
    />
  )
}
