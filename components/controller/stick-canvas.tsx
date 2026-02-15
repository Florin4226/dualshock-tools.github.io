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
  highlight?: boolean
}

/**
 * Direct port of draw_stick_dial from the original dualshock-tools stick-renderer.js.
 * Uses the exact same constants, color mapping, and rendering logic.
 */
export function StickCanvas({ x, y, label, circularityData, size = 200, zoomCenter = false, highlight = false }: StickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const center_x = size / 2
    const center_y = size / 2
    const sz = Math.min(size, size) * 0.45

    // Draw base circle
    ctx.lineWidth = 1
    ctx.fillStyle = "#ffffff"
    ctx.strokeStyle = "#000000"
    ctx.beginPath()
    ctx.arc(center_x, center_y, sz, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // cc_to_color: exact port from original stick-renderer.js
    function cc_to_color(cc: number): number {
      const dd = Math.sqrt(Math.pow(1.0 - cc, 2))
      let hh: number
      if (cc <= 1.0) {
        hh = 220 - 220 * Math.min(1.0, Math.max(0, (dd - 0.05)) / 0.1)
      } else {
        hh = (245 + (360 - 245) * Math.min(1.0, Math.max(0, (dd - 0.05)) / 0.15)) % 360
      }
      return hh
    }

    // Draw circularity visualization if data provided
    if (circularityData && circularityData.length > 0) {
      const MAX_N = CIRCULARITY_DATA_SIZE

      for (let i = 0; i < MAX_N; i++) {
        const kd = circularityData[i]
        const kd1 = circularityData[(i + 1) % CIRCULARITY_DATA_SIZE]
        if (kd === undefined || kd1 === undefined) continue
        const ka = i * Math.PI * 2 / MAX_N
        const ka1 = ((i + 1) % MAX_N) * 2 * Math.PI / MAX_N

        const kx = Math.cos(ka) * kd
        const ky = Math.sin(ka) * kd
        const kx1 = Math.cos(ka1) * kd1
        const ky1 = Math.sin(ka1) * kd1

        ctx.beginPath()
        ctx.moveTo(center_x, center_y)
        ctx.lineTo(center_x + kx * sz, center_y + ky * sz)
        ctx.lineTo(center_x + kx1 * sz, center_y + ky1 * sz)
        ctx.lineTo(center_x, center_y)
        ctx.closePath()

        const cc = (kd + kd1) / 2
        const hh = cc_to_color(cc)
        ctx.fillStyle = "hsla(" + parseInt(String(hh)) + ", 100%, 50%, 0.5)"
        ctx.fill()
      }
    }

    // Draw circularity error text if enough data provided
    if (circularityData && circularityData.filter(n => n > 0.3).length > 10) {
      const circularityError = calculateCircularityError(circularityData)

      ctx.fillStyle = "#fff"
      ctx.strokeStyle = "#444"
      ctx.lineWidth = 3
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      ctx.font = `${Math.round(size * 0.12)}px Arial`
      const text_y = center_y + sz * 0.5
      const text = `${circularityError.toFixed(1)} %`

      ctx.strokeText(text, center_x, text_y)
      ctx.fillText(text, center_x, text_y)
    }

    // Draw crosshairs
    ctx.strokeStyle = "#aaaaaa"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(center_x - sz, center_y)
    ctx.lineTo(center_x + sz, center_y)
    ctx.closePath()
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(center_x, center_y - sz)
    ctx.lineTo(center_x, center_y + sz)
    ctx.closePath()
    ctx.stroke()

    // Apply center zoom transformation if enabled
    let display_x = x
    let display_y = y
    if (zoomCenter) {
      const distance = Math.sqrt(x * x + y * y)
      if (distance > 0) {
        const angle = Math.atan2(y, x)
        const new_distance = distance <= 0.05
          ? (distance / 0.05) * 0.5
          : 0.5 + ((distance - 0.05) / 0.95) * 0.5
        display_x = Math.cos(angle) * new_distance
        display_y = Math.sin(angle) * new_distance
      }

      // Draw light gray circle at 50% radius to show border of zoomed center
      ctx.strokeStyle = "#d3d3d3"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(center_x, center_y, sz * 0.5, 0, 2 * Math.PI)
      ctx.stroke()
    }

    ctx.fillStyle = "#000000"
    ctx.strokeStyle = "#000000"

    // Draw stick line with variable thickness
    const stick_distance = Math.sqrt(display_x * display_x + display_y * display_y)
    const boundary_radius = 0.5

    const use_two_segments = zoomCenter && stick_distance > boundary_radius
    if (use_two_segments) {
      const boundary_x = (display_x / stick_distance) * boundary_radius
      const boundary_y = (display_y / stick_distance) * boundary_radius

      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(center_x, center_y)
      ctx.lineTo(center_x + boundary_x * sz, center_y + boundary_y * sz)
      ctx.stroke()

      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(center_x + boundary_x * sz, center_y + boundary_y * sz)
      ctx.lineTo(center_x + display_x * sz, center_y + display_y * sz)
      ctx.stroke()
    } else {
      ctx.lineWidth = zoomCenter ? 3 : 1
      ctx.beginPath()
      ctx.moveTo(center_x, center_y)
      ctx.lineTo(center_x + display_x * sz, center_y + display_y * sz)
      ctx.stroke()
    }

    // Draw filled circle at stick position
    ctx.beginPath()
    ctx.arc(center_x + display_x * sz, center_y + display_y * sz, highlight ? 4 : 3, 0, 2 * Math.PI)
    ctx.fillStyle = highlight ? "#2989f7ff" : "#030b84ff"
    ctx.fill()

    // Label below circle
    ctx.fillStyle = "#666666"
    ctx.font = `${Math.round(size * 0.055)}px Arial`
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText(label, center_x, center_y + sz + 6)
  }, [x, y, circularityData, size, zoomCenter, highlight, label])

  useEffect(() => { draw() }, [draw])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded"
    />
  )
}
