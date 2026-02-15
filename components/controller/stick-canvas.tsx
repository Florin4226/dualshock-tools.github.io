"use client"

import { useRef, useEffect, useCallback } from "react"
import { CIRCULARITY_DATA_SIZE, calculateCircularityError } from "@/lib/controller/utils"

interface StickCanvasProps {
  x: number
  y: number
  label: string
  circularityData?: number[]
  size?: number
  zoomCenter?: boolean
}

/**
 * Exact 1:1 port of draw_stick_dial from the original stick-renderer.js
 * The original normalises stick values to -1..+1 and radius occupies ~45% of canvas.
 */
export function StickCanvas({ x, y, label, circularityData, size = 200, zoomCenter = false }: StickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = size
    const h = size
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = w / 2
    const cy = h / 2
    // The original uses 45% of the shorter side as the main radius
    const R = Math.min(w, h) * 0.45

    // ---- Background circle (white fill, black stroke) ----
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = "#000000"
    ctx.stroke()
    ctx.restore()

    // ---- Circularity coloured wedges ----
    // Original algorithm: for each pair of adjacent sectors, draw a triangle
    // from center to the two edge points, coloured by hue mapped from distance.
    if (circularityData && circularityData.length > 0) {
      const N = CIRCULARITY_DATA_SIZE
      for (let i = 0; i < N; i++) {
        const d0 = circularityData[i]
        const d1 = circularityData[(i + 1) % N]
        if (d0 === undefined || d1 === undefined) continue
        if (d0 <= 0 && d1 <= 0) continue

        // Data is stored via atan2 mapped to 0..N with (angle+PI)/(2*PI)*N
        // So sector i corresponds to angle: i/N * 2*PI - PI
        const a0 = (i / N) * Math.PI * 2 - Math.PI
        const a1 = (((i + 1) % N) / N) * Math.PI * 2 - Math.PI

        // Pixel positions on the circle edge, scaled by the measured distance
        const px0 = cx + Math.cos(a0) * d0 * R
        const py0 = cy + Math.sin(a0) * d0 * R
        const px1 = cx + Math.cos(a1) * d1 * R
        const py1 = cy + Math.sin(a1) * d1 * R

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(px0, py0)
        ctx.lineTo(px1, py1)
        ctx.closePath()

        // Original hue mapping: ccToColor
        const avg = (d0 + d1) / 2
        const hue = ccToColor(avg)
        ctx.fillStyle = `hsla(${Math.round(hue)}, 100%, 50%, 0.50)`
        ctx.fill()
      }

      // Circularity error % text (only if enough data)
      const filled = circularityData.filter(v => v > 0.3).length
      if (filled > 10) {
        const err = calculateCircularityError(circularityData)
        const txt = `${err.toFixed(1)}%`
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        // White text with dark outline (original uses strokeText)
        ctx.lineWidth = 3
        ctx.strokeStyle = "#333333"
        ctx.fillStyle = "#ffffff"
        ctx.strokeText(txt, cx, cy + R * 0.55)
        ctx.fillText(txt, cx, cy + R * 0.55)
      }
    }

    // ---- Crosshairs (gray) ----
    ctx.strokeStyle = "#aaaaaa"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - R, cy)
    ctx.lineTo(cx + R, cy)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx, cy - R)
    ctx.lineTo(cx, cy + R)
    ctx.stroke()

    // ---- Zoom center mode: draw 50% boundary ring ----
    if (zoomCenter) {
      ctx.strokeStyle = "#d3d3d3"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2)
      ctx.stroke()
    }

    // ---- Transform stick position ----
    let sx = x
    let sy = y
    if (zoomCenter) {
      // Original center zoom: inner 5% mapped to inner 50%, outer 95% mapped to outer 50%
      const dist = Math.sqrt(x * x + y * y)
      if (dist > 0) {
        const angle = Math.atan2(y, x)
        const mapped = dist <= 0.05
          ? (dist / 0.05) * 0.5
          : 0.5 + ((dist - 0.05) / 0.95) * 0.5
        sx = Math.cos(angle) * mapped
        sy = Math.sin(angle) * mapped
      }
    }

    // ---- Line from center to stick position ----
    const stickDist = Math.sqrt(sx * sx + sy * sy)
    ctx.strokeStyle = "#000000"
    ctx.fillStyle = "#000000"

    if (zoomCenter && stickDist > 0.5) {
      // Two-segment line: thick inner, thin outer (original behaviour)
      const boundaryFrac = 0.5 / stickDist
      const bx = sx * boundaryFrac
      const by = sy * boundaryFrac

      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + bx * R, cy + by * R)
      ctx.stroke()

      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx + bx * R, cy + by * R)
      ctx.lineTo(cx + sx * R, cy + sy * R)
      ctx.stroke()
    } else {
      ctx.lineWidth = zoomCenter ? 3 : 1
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + sx * R, cy + sy * R)
      ctx.stroke()
    }

    // ---- Stick dot (original: dark blue #030b84, radius 3) ----
    ctx.beginPath()
    ctx.arc(cx + sx * R, cy + sy * R, 3, 0, Math.PI * 2)
    ctx.fillStyle = "#030b84"
    ctx.fill()

    // ---- Label below circle ----
    ctx.fillStyle = "#666666"
    ctx.font = "11px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText(label, cx, cy + R + 6)
  }, [x, y, circularityData, size, zoomCenter, label])

  useEffect(() => { draw() }, [draw])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded"
    />
  )
}

/**
 * Exact port of ccToColor from the original stick-renderer.js:
 *   dd = sqrt((1.0 - cc)^2)
 *   if cc <= 1.0 -> hue = 220 - 220 * clamp((dd-0.05)/0.10)  [green -> red]
 *   if cc > 1.0  -> hue = (245 + (360-245) * clamp((dd-0.05)/0.15)) % 360  [blue -> red wrap]
 */
function ccToColor(cc: number): number {
  const dd = Math.sqrt(Math.pow(1.0 - cc, 2))
  if (cc <= 1.0) {
    return 220 - 220 * Math.min(1.0, Math.max(0, (dd - 0.05) / 0.10))
  }
  return (245 + (360 - 245) * Math.min(1.0, Math.max(0, (dd - 0.05) / 0.15))) % 360
}
