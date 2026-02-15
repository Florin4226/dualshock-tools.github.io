"use client"

import { useState, useTransition } from "react"
import { Plus, Search, Pencil, Trash2, ClipboardList, ChevronDown, FileText, Receipt } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { createServiceRecord, updateServiceRecord, deleteServiceRecord } from "../actions"
import { STATUS_LABELS, STATUS_COLORS, DEVICE_TYPE_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RecordRow {
  id: string
  device_id: string
  pricing_id: string | null
  status: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  diagnosis: string | null
  work_performed: string | null
  parts_used: string | null
  total_price: number
  currency: string
  technician_id: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  devices: { serial_number: string; device_type: string; brand: string | null; model: string | null } | null
  pricing: { service_name: string; price: number } | null
  technician: { full_name: string } | null
}

interface DeviceOption { id: string; serial_number: string; device_type: string; brand: string | null; model: string | null }
interface PricingOption { id: string; service_name: string; price: number }

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const labelClass = "text-sm font-medium text-foreground"
const btnPrimary =
  "flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
const btnOutline =
  "flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"

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

export function ServicesClient({
  records,
  devices,
  pricingItems,
  isAdmin,
}: {
  records: RecordRow[]
  devices: DeviceOption[]
  pricingItems: PricingOption[]
  isAdmin: boolean
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecordRow | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [selectedPricing, setSelectedPricing] = useState<string>("")
  const [pdfBusy, setPdfBusy] = useState<string | null>(null)

  const filtered = records.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    const term = search.toLowerCase()
    const matchesSearch =
      !term ||
      r.devices?.serial_number.toLowerCase().includes(term) ||
      r.customer_name?.toLowerCase().includes(term) ||
      r.pricing?.service_name.toLowerCase().includes(term) ||
      r.id.toLowerCase().includes(term)
    return matchesStatus && matchesSearch
  })

  function openNew() { setEditing(null); setError(""); setSelectedPricing(""); setModalOpen(true) }
  function openEdit(record: RecordRow) { setEditing(record); setError(""); setSelectedPricing(record.pricing_id ?? ""); setModalOpen(true) }

  function handlePricingChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedPricing(e.target.value)
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateServiceRecord(editing.id, formData)
        : await createServiceRecord(formData)
      if (result.error) setError(result.error)
      else setModalOpen(false)
    })
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this service record?")) return
    startTransition(async () => {
      const result = await deleteServiceRecord(id)
      if (result.error) setError(result.error)
    })
  }

  async function handleReport(record: RecordRow) {
    setPdfBusy(record.id)
    try {
      const doc = await generateServicePDF(record)
      doc.save(`service-report-${record.devices?.serial_number ?? record.id.slice(0, 8)}.pdf`)
    } finally { setPdfBusy(null) }
  }

  async function handleReceipt(record: RecordRow) {
    setPdfBusy(record.id)
    try {
      const doc = await generateReceiptPDF(record)
      doc.save(`receipt-${record.devices?.serial_number ?? record.id.slice(0, 8)}.pdf`)
    } finally { setPdfBusy(null) }
  }

  const selectedPricingItem = pricingItems.find((p) => p.id === selectedPricing)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Service Records</h2>
          <p className="mt-1 text-sm text-muted-foreground">{records.length} total records</p>
        </div>
        <button onClick={openNew} className={btnPrimary}>
          <Plus className="h-4 w-4" /> New Service
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} className={cn(inputClass, "pl-9")} />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cn(inputClass, "w-auto appearance-none pr-8")}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">No service records found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.length === 0 ? "Create your first service record." : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((record) => (
            <div key={record.id} className="rounded-lg border border-border bg-card transition-colors hover:border-border/80">
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-medium text-foreground">{record.devices?.serial_number ?? "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">{DEVICE_TYPE_LABELS[record.devices?.device_type ?? ""]}</span>
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[record.status])}>
                    {STATUS_LABELS[record.status]}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleReport(record)} disabled={pdfBusy === record.id} className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50" title="Download Service Report">
                    <FileText className="h-3.5 w-3.5" /> Report
                  </button>
                  <button onClick={() => handleReceipt(record)} disabled={pdfBusy === record.id} className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50" title="Download Payment Receipt">
                    <Receipt className="h-3.5 w-3.5" /> Receipt
                  </button>
                  <button onClick={() => openEdit(record)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(record.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* Body */}
              <div className="grid grid-cols-2 gap-4 px-4 py-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm text-foreground">{record.customer_name || "-"}</p>
                  {record.customer_phone && <p className="text-xs text-muted-foreground">{record.customer_phone}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Service</p>
                  <p className="text-sm text-foreground">{record.pricing?.service_name ?? "Custom"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Technician</p>
                  <p className="text-sm text-foreground">{record.technician?.full_name ?? "-"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-lg font-bold font-mono text-foreground">{Number(record.total_price).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{record.currency}</span></p>
                </div>
              </div>
              {/* Diagnosis preview */}
              {record.diagnosis && (
                <div className="border-t border-border px-4 py-2">
                  <p className="text-xs text-muted-foreground line-clamp-1">{record.diagnosis}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Service Record" : "New Service Record"} className="max-w-2xl">
        <form action={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">{error}</div>}

          {!editing && (
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Device</label>
              <select name="device_id" required className={inputClass}>
                <option value="" disabled>Select a device</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.serial_number} - {d.brand} {d.model}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Customer Name</label>
              <input name="customer_name" defaultValue={editing?.customer_name ?? ""} className={inputClass} placeholder="Customer name" />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Customer Phone</label>
              <input name="customer_phone" defaultValue={editing?.customer_phone ?? ""} className={inputClass} placeholder="+40..." />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Customer Email</label>
            <input name="customer_email" type="email" defaultValue={editing?.customer_email ?? ""} className={inputClass} placeholder="customer@example.com" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Service / Pricing</label>
              <select name="pricing_id" value={selectedPricing} onChange={handlePricingChange} className={inputClass}>
                <option value="">Custom (manual price)</option>
                {pricingItems.map((p) => (
                  <option key={p.id} value={p.id}>{p.service_name} - {Number(p.price).toFixed(2)} RON</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Total Price (RON)</label>
              <input name="total_price" type="number" step="0.01" min="0" required defaultValue={editing ? Number(editing.total_price) : selectedPricingItem ? Number(selectedPricingItem.price) : ""} key={selectedPricing} className={inputClass} placeholder="0.00" />
            </div>
          </div>

          {editing && (
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Status</label>
              <select name="status" defaultValue={editing.status} className={inputClass}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Diagnosis</label>
            <textarea name="diagnosis" defaultValue={editing?.diagnosis ?? ""} rows={2} className={cn(inputClass, "h-auto resize-none")} placeholder="Describe the issue..." />
          </div>

          {editing && (
            <>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Work Performed</label>
                <textarea name="work_performed" defaultValue={editing.work_performed ?? ""} rows={2} className={cn(inputClass, "h-auto resize-none")} placeholder="Describe work done..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Parts Used</label>
                <textarea name="parts_used" defaultValue={editing.parts_used ?? ""} rows={2} className={cn(inputClass, "h-auto resize-none")} placeholder="List parts used..." />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnOutline}>Cancel</button>
            <button type="submit" disabled={isPending} className={btnPrimary}>
              {isPending ? "Saving..." : editing ? "Update" : "Create Record"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
