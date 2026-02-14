"use client"

import { useState } from "react"
import { FileText, Download, Printer, ClipboardList } from "lucide-react"
import { STATUS_LABELS, STATUS_COLORS, DEVICE_TYPE_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RecordRow {
  id: string
  status: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  diagnosis: string | null
  work_performed: string | null
  parts_used: string | null
  total_price: number
  currency: string
  created_at: string
  completed_at: string | null
  devices: { serial_number: string; device_type: string; brand: string | null; model: string | null } | null
  pricing: { service_name: string; price: number } | null
  technician: { full_name: string } | null
}

async function generatePDF(record: RecordRow) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const w = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentW = w - margin * 2
  let y = margin

  // Header
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("ByteBurst Technology SRL", margin, y)
  y += 8
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  doc.text("Service Report", margin, y)
  y += 4
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, w - margin, y)
  y += 10
  doc.setTextColor(0, 0, 0)

  // ─ Device Info ─
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("DEVICE INFORMATION", margin, y)
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  const deviceLines = [
    ["Serial Number", record.devices?.serial_number ?? "N/A"],
    ["Type", DEVICE_TYPE_LABELS[record.devices?.device_type ?? ""] ?? "N/A"],
    ["Brand", record.devices?.brand ?? "N/A"],
    ["Model", record.devices?.model ?? "N/A"],
  ]
  deviceLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${label}:`, margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(value, margin + 40, y)
    y += 5.5
  })
  y += 4

  // ─ Customer Info ─
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("CUSTOMER INFORMATION", margin, y)
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")

  const custLines = [
    ["Name", record.customer_name ?? "N/A"],
    ["Phone", record.customer_phone ?? "N/A"],
    ["Email", record.customer_email ?? "N/A"],
  ]
  custLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${label}:`, margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(value, margin + 40, y)
    y += 5.5
  })
  y += 4

  // ─ Service Details ─
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("SERVICE DETAILS", margin, y)
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")

  const svcLines = [
    ["Service", record.pricing?.service_name ?? "Custom Service"],
    ["Status", STATUS_LABELS[record.status] ?? record.status],
    ["Technician", record.technician?.full_name ?? "N/A"],
    ["Date Created", new Date(record.created_at).toLocaleDateString()],
    ...(record.completed_at ? [["Date Completed", new Date(record.completed_at).toLocaleDateString()]] : []),
  ]
  svcLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${label}:`, margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(value, margin + 40, y)
    y += 5.5
  })
  y += 4

  // ─ Diagnosis ─
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("DIAGNOSIS", margin, y)
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
  const diagLines = doc.splitTextToSize(record.diagnosis ?? "No diagnosis recorded.", contentW)
  doc.text(diagLines, margin, y)
  y += diagLines.length * 5 + 4

  // ─ Work Performed ─
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("WORK PERFORMED", margin, y)
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
  const workLines = doc.splitTextToSize(record.work_performed ?? "No work details recorded.", contentW)
  doc.text(workLines, margin, y)
  y += workLines.length * 5 + 4

  // ─ Parts Used ─
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("PARTS USED", margin, y)
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
  const partsLines = doc.splitTextToSize(record.parts_used ?? "No parts recorded.", contentW)
  doc.text(partsLines, margin, y)
  y += partsLines.length * 5 + 8

  // ─ Total ─
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(margin, y, w - margin, y)
  y += 8
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  const totalText = `Total: ${Number(record.total_price).toFixed(2)} ${record.currency}`
  const totalWidth = doc.getTextWidth(totalText)
  doc.text(totalText, w - margin - totalWidth, y)
  y += 12

  // ─ Footer ─
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(150, 150, 150)
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, pageH - 20, w - margin, pageH - 20)
  doc.text("ByteBurst Technology SRL — Service Report", margin, pageH - 14)
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, pageH - 10)

  return doc
}

export function DocumentsClient({ records }: { records: RecordRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const selected = records.find((r) => r.id === selectedId)

  async function handleDownloadPDF(record: RecordRow) {
    setGenerating(true)
    try {
      const doc = await generatePDF(record)
      doc.save(`service-report-${record.devices?.serial_number ?? record.id}.pdf`)
    } finally {
      setGenerating(false)
    }
  }

  async function handlePrint(record: RecordRow) {
    setGenerating(true)
    try {
      const doc = await generatePDF(record)
      const blob = doc.output("blob")
      const url = URL.createObjectURL(blob)
      const win = window.open(url, "_blank")
      if (win) {
        win.addEventListener("load", () => {
          setTimeout(() => win.print(), 400)
        })
      }
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">Generate PDF service reports for completed and in-progress records.</p>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">No records available</p>
          <p className="mt-1 text-sm text-muted-foreground">Complete or start service records to generate documents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Record list */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">{records.length} records</p>
              </div>
              <div className="flex flex-col divide-y divide-border max-h-[600px] overflow-y-auto">
                {records.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      "flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedId === record.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium text-foreground">{record.devices?.serial_number}</span>
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[record.status])}>
                        {STATUS_LABELS[record.status]}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{record.customer_name ?? "No customer"} - {record.pricing?.service_name ?? "Custom"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Service Report Preview</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadPDF(selected)}
                      disabled={generating}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" /> {generating ? "Generating..." : "Download PDF"}
                    </button>
                    <button
                      onClick={() => handlePrint(selected)}
                      disabled={generating}
                      className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-foreground">ByteBurst Technology SRL</h3>
                    <p className="text-sm text-muted-foreground">Service Report</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Device</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Serial:</span> {selected.devices?.serial_number}</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Type:</span> {DEVICE_TYPE_LABELS[selected.devices?.device_type ?? ""]}</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Brand:</span> {selected.devices?.brand ?? "N/A"}</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Model:</span> {selected.devices?.model ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
                      <p className="text-sm text-foreground">{selected.customer_name ?? "N/A"}</p>
                      <p className="text-sm text-foreground">{selected.customer_phone ?? "N/A"}</p>
                      <p className="text-sm text-foreground">{selected.customer_email ?? "N/A"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Service</p>
                      <p className="text-sm text-foreground">{selected.pricing?.service_name ?? "Custom Service"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Diagnosis</p>
                      <p className="text-sm text-foreground">{selected.diagnosis || "No diagnosis recorded."}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Work Performed</p>
                      <p className="text-sm text-foreground">{selected.work_performed || "No work details recorded."}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Parts Used</p>
                      <p className="text-sm text-foreground">{selected.parts_used || "No parts recorded."}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <div className="text-sm text-muted-foreground">
                      <p>Technician: {selected.technician?.full_name ?? "N/A"}</p>
                      <p>Status: {STATUS_LABELS[selected.status]}</p>
                    </div>
                    <span className="text-xl font-bold text-foreground">{Number(selected.total_price).toFixed(2)} {selected.currency}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium text-foreground">Select a record</p>
                <p className="mt-1 text-sm text-muted-foreground">Choose a service record from the list to preview and generate a PDF.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
