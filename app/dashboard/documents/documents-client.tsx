"use client"

import { useState } from "react"
import { FileText, Download, Printer, ClipboardList, Receipt, Filter } from "lucide-react"
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

async function generateServicePDF(record: RecordRow) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const w = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentW = w - margin * 2
  let y = margin

  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("ByteBurst Technology SRL", margin, y)
  y += 8
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  doc.text("Service Report", margin, y)
  doc.text(`#${record.id.slice(0, 8).toUpperCase()}`, w - margin - doc.getTextWidth(`#${record.id.slice(0, 8).toUpperCase()}`), y)
  y += 4
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, w - margin, y)
  y += 10
  doc.setTextColor(0, 0, 0)

  function section(title: string) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 100, 100)
    doc.text(title.toUpperCase(), margin, y)
    y += 6
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
  }

  function row(label: string, value: string) {
    doc.setFont("helvetica", "bold")
    doc.text(`${label}:`, margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(value, margin + 42, y)
    y += 5.5
  }

  section("Device Information")
  row("Serial Number", record.devices?.serial_number ?? "N/A")
  row("Type", DEVICE_TYPE_LABELS[record.devices?.device_type ?? ""] ?? "N/A")
  row("Brand / Model", `${record.devices?.brand ?? "N/A"} ${record.devices?.model ?? ""}`.trim())
  y += 4

  section("Customer Information")
  row("Name", record.customer_name ?? "N/A")
  row("Phone", record.customer_phone ?? "N/A")
  row("Email", record.customer_email ?? "N/A")
  y += 4

  section("Service Details")
  row("Service", record.pricing?.service_name ?? "Custom Service")
  row("Status", STATUS_LABELS[record.status] ?? record.status)
  row("Technician", record.technician?.full_name ?? "N/A")
  row("Date Created", new Date(record.created_at).toLocaleDateString("ro-RO"))
  if (record.completed_at) row("Date Completed", new Date(record.completed_at).toLocaleDateString("ro-RO"))
  y += 4

  section("Diagnosis")
  const diagLines = doc.splitTextToSize(record.diagnosis ?? "No diagnosis recorded.", contentW)
  doc.text(diagLines, margin, y)
  y += diagLines.length * 5 + 4

  if (y > 200) { doc.addPage(); y = margin }

  section("Work Performed")
  const workLines = doc.splitTextToSize(record.work_performed ?? "No work details recorded.", contentW)
  doc.text(workLines, margin, y)
  y += workLines.length * 5 + 4

  section("Parts Used")
  const partsLines = doc.splitTextToSize(record.parts_used ?? "No parts recorded.", contentW)
  doc.text(partsLines, margin, y)
  y += partsLines.length * 5 + 8

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(margin, y, w - margin, y)
  y += 8
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  const totalText = `Total: ${Number(record.total_price).toFixed(2)} ${record.currency}`
  doc.text(totalText, w - margin - doc.getTextWidth(totalText), y)

  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(150, 150, 150)
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, pageH - 20, w - margin, pageH - 20)
  doc.text("ByteBurst Technology SRL — Service Report", margin, pageH - 14)
  doc.text(`Generated on ${new Date().toLocaleDateString("ro-RO")} at ${new Date().toLocaleTimeString("ro-RO")}`, margin, pageH - 10)

  return doc
}

async function generateReceiptPDF(record: RecordRow) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 200] })
  const w = 80
  const margin = 5
  let y = 10

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("ByteBurst Technology", w / 2, y, { align: "center" })
  y += 5
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("SRL", w / 2, y, { align: "center" })
  y += 6
  doc.setDrawColor(150)
  doc.setLineDashPattern([1, 1], 0)
  doc.line(margin, y, w - margin, y)
  y += 5

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT RECEIPT", w / 2, y, { align: "center" })
  y += 6

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`Receipt #: ${record.id.slice(0, 8).toUpperCase()}`, margin, y)
  y += 4
  doc.text(`Date: ${new Date().toLocaleDateString("ro-RO")}`, margin, y)
  y += 4
  doc.text(`Time: ${new Date().toLocaleTimeString("ro-RO")}`, margin, y)
  y += 6

  doc.line(margin, y, w - margin, y)
  y += 5

  doc.setFont("helvetica", "bold")
  doc.text("Customer:", margin, y)
  y += 4
  doc.setFont("helvetica", "normal")
  doc.text(record.customer_name ?? "Walk-in", margin, y)
  y += 4
  if (record.customer_phone) { doc.text(record.customer_phone, margin, y); y += 4 }
  y += 2

  doc.line(margin, y, w - margin, y)
  y += 5

  doc.setFont("helvetica", "bold")
  doc.text("Service:", margin, y)
  y += 4
  doc.setFont("helvetica", "normal")
  const svcName = record.pricing?.service_name ?? "Custom Service"
  const svcLines = doc.splitTextToSize(svcName, w - margin * 2)
  doc.text(svcLines, margin, y)
  y += svcLines.length * 3.5 + 2

  doc.text(`Device: ${record.devices?.serial_number ?? "N/A"}`, margin, y)
  y += 4
  doc.text(`Type: ${DEVICE_TYPE_LABELS[record.devices?.device_type ?? ""] ?? "N/A"}`, margin, y)
  y += 6

  doc.line(margin, y, w - margin, y)
  y += 5

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  const total = `TOTAL: ${Number(record.total_price).toFixed(2)} ${record.currency}`
  doc.text(total, w / 2, y, { align: "center" })
  y += 8

  doc.setLineDashPattern([1, 1], 0)
  doc.line(margin, y, w - margin, y)
  y += 5

  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100)
  doc.text("Thank you for choosing ByteBurst!", w / 2, y, { align: "center" })
  y += 4
  doc.text("Technician: " + (record.technician?.full_name ?? "N/A"), w / 2, y, { align: "center" })

  return doc
}

export function DocumentsClient({ records }: { records: RecordRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const selected = records.find((r) => r.id === selectedId)

  const filtered = statusFilter === "all" ? records : records.filter((r) => r.status === statusFilter)

  async function handleDownloadReport(record: RecordRow) {
    setGenerating(true)
    try {
      const doc = await generateServicePDF(record)
      doc.save(`service-report-${record.devices?.serial_number ?? record.id.slice(0, 8)}.pdf`)
    } finally { setGenerating(false) }
  }

  async function handleDownloadReceipt(record: RecordRow) {
    setGenerating(true)
    try {
      const doc = await generateReceiptPDF(record)
      doc.save(`receipt-${record.devices?.serial_number ?? record.id.slice(0, 8)}.pdf`)
    } finally { setGenerating(false) }
  }

  async function handlePrint(record: RecordRow) {
    setGenerating(true)
    try {
      const doc = await generateServicePDF(record)
      const blob = doc.output("blob")
      const url = URL.createObjectURL(blob)
      const win = window.open(url, "_blank")
      if (win) win.addEventListener("load", () => setTimeout(() => win.print(), 400))
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } finally { setGenerating(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">Generate PDF service reports and payment receipts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">No records found</p>
          <p className="mt-1 text-sm text-muted-foreground">Create service records to generate documents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Record list */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">{filtered.length} records</p>
              </div>
              <div className="flex flex-col divide-y divide-border max-h-[600px] overflow-y-auto">
                {filtered.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      "flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedId === record.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium text-foreground">{record.devices?.serial_number ?? "N/A"}</span>
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[record.status])}>
                        {STATUS_LABELS[record.status]}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{record.customer_name ?? "No customer"} - {record.pricing?.service_name ?? "Custom"}</span>
                    <span className="text-xs font-mono text-muted-foreground">{Number(record.total_price).toFixed(2)} {record.currency}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="rounded-lg border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Service Report Preview</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleDownloadReport(selected)}
                      disabled={generating}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" /> Service Report
                    </button>
                    <button
                      onClick={() => handleDownloadReceipt(selected)}
                      disabled={generating}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Payment Receipt
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
                  {/* Company header */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-foreground">ByteBurst Technology SRL</h3>
                    <p className="text-sm text-muted-foreground">Service Report &middot; #{selected.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Device</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Serial:</span> {selected.devices?.serial_number ?? "N/A"}</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Type:</span> {DEVICE_TYPE_LABELS[selected.devices?.device_type ?? ""] ?? "N/A"}</p>
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
                  {/* Service details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Service</p>
                        <p className="text-sm text-foreground">{selected.pricing?.service_name ?? "Custom Service"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[selected.status])}>{STATUS_LABELS[selected.status]}</span>
                      </div>
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
                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <div className="text-sm text-muted-foreground">
                      <p>Technician: {selected.technician?.full_name ?? "N/A"}</p>
                      <p>Date: {new Date(selected.created_at).toLocaleDateString("ro-RO")}</p>
                      {selected.completed_at && <p>Completed: {new Date(selected.completed_at).toLocaleDateString("ro-RO")}</p>}
                    </div>
                    <span className="text-2xl font-bold font-mono text-foreground">{Number(selected.total_price).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{selected.currency}</span></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium text-foreground">Select a record</p>
                <p className="mt-1 text-sm text-muted-foreground">Choose a service record from the list to preview and generate documents.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
