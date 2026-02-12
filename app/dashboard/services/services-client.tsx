"use client"

import { useState, useTransition } from "react"
import { Plus, Search, Pencil, Trash2, ClipboardList, ChevronDown } from "lucide-react"
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
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Device</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Technician</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-medium text-foreground">{record.devices?.serial_number ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{DEVICE_TYPE_LABELS[record.devices?.device_type ?? ""] ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{record.customer_name || "-"}</p>
                    {record.customer_phone && <p className="text-xs text-muted-foreground">{record.customer_phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{record.pricing?.service_name ?? "Custom"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{record.technician?.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[record.status])}>
                      {STATUS_LABELS[record.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    {Number(record.total_price).toFixed(2)} <span className="text-xs text-muted-foreground">{record.currency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(record)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(record.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
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
