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

function ccToColor(cc: number): number {
  const dd = Math.sqrt(Math.pow(1.0 - cc, 2))
  if (cc <= 1.0) {
    return 220 - 220 * Math.min(1.0, Math.max(0, (dd - 0.05)) / 0.1)
  }
  return (245 + (360 - 245) * Math.min(1.0, Math.max(0, (dd - 0.05)) / 0.15)) % 360
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

    // White background circle -- matches the original exactly
    ctx.lineWidth = 1
    ctx.fillStyle = "#ffffff"
    ctx.strokeStyle = "#000000"
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Circularity visualization -- colored triangle wedges from center
    if (circularityData && circularityData.length > 0) {
      const MAX_N = CIRCULARITY_DATA_SIZE
      for (let i = 0; i < MAX_N; i++) {
        const kd = circularityData[i]
        const kd1 = circularityData[(i + 1) % MAX_N]
        if (kd === undefined || kd1 === undefined) continue
        const ka = (i * Math.PI * 2) / MAX_N
        const ka1 = (((i + 1) % MAX_N) * 2 * Math.PI) / MAX_N

        const kx = Math.cos(ka) * kd
        const ky = Math.sin(ka) * kd
        const kx1 = Math.cos(ka1) * kd1
        const ky1 = Math.sin(ka1) * kd1

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + kx * r, cy + ky * r)
        ctx.lineTo(cx + kx1 * r, cy + ky1 * r)
        ctx.lineTo(cx, cy)
        ctx.closePath()

        const cc = (kd + kd1) / 2
        const hh = ccToColor(cc)
        ctx.fillStyle = `hsla(${Math.round(hh)}, 100%, 50%, 0.5)`
        ctx.fill()
      }

      // Circularity error text
      const validCount = circularityData.filter(n => n > 0.3).length
      if (validCount > 10) {
        const err = calculateCircularityError(circularityData)
        ctx.fillStyle = "#fff"
        ctx.strokeStyle = "#444"
        ctx.lineWidth = 3
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.font = "bold 18px Arial"
        const textY = cy + r * 0.5
        const text = `${err.toFixed(1)} %`
        ctx.strokeText(text, cx, textY)
        ctx.fillText(text, cx, textY)
      }
    }

    // Crosshairs
    ctx.strokeStyle = "#aaaaaa"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - r, cy)
    ctx.lineTo(cx + r, cy)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx, cy - r)
    ctx.lineTo(cx, cy + r)
    ctx.closePath()
    ctx.stroke()

    // Zoom center ring at 50% radius
    if (zoomCenter) {
      ctx.strokeStyle = "#d3d3d3"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.5, 0, 2 * Math.PI)
      ctx.stroke()
    }

    // Transform stick position
    let dx = x, dy = y
    if (zoomCenter) {
      const z = applyCenterZoom(x, y)
      dx = z.x
      dy = z.y
    }

    // Line from center to stick position (variable thickness in zoom mode)
    ctx.fillStyle = "#000000"
    ctx.strokeStyle = "#000000"

    const stickDist = Math.sqrt(dx * dx + dy * dy)
    const boundaryRadius = 0.5
    const useTwoSegments = zoomCenter && stickDist > boundaryRadius

    if (useTwoSegments) {
      const bx = (dx / stickDist) * boundaryRadius
      const by = (dy / stickDist) * boundaryRadius
      // Thick inner segment
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + bx * r, cy + by * r)
      ctx.stroke()
      // Thin outer segment
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx + bx * r, cy + by * r)
      ctx.lineTo(cx + dx * r, cy + dy * r)
      ctx.stroke()
    } else {
      ctx.lineWidth = zoomCenter ? 3 : 1
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + dx * r, cy + dy * r)
      ctx.stroke()
    }

    // Filled dot at stick position
    ctx.beginPath()
    ctx.arc(cx + dx * r, cy + dy * r, 3, 0, 2 * Math.PI)
    ctx.fillStyle = "#030b84"
    ctx.fill()

    // Label underneath
    ctx.fillStyle = "#666666"
    ctx.font = "11px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText(label, cx, size - 6)
  }, [x, y, circularityData, size, zoomCenter, label])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded"
    />
  )
}
