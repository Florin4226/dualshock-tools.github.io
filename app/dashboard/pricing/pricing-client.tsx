"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, DollarSign, Clock } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { createPricing, updatePricing, deletePricing } from "../actions"
import { cn } from "@/lib/utils"

interface PricingItemRow {
  id: string
  category_id: string
  service_name: string
  description: string | null
  price: number
  currency: string
  estimated_minutes: number | null
  is_active: boolean
  categories: { name: string; device_type: string } | null
}

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const labelClass = "text-sm font-medium text-foreground"
const btnPrimary =
  "flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
const btnOutline =
  "flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"

export function PricingClient({
  items,
  categories,
  isAdmin,
}: {
  items: PricingItemRow[]
  categories: { id: string; name: string }[]
  isAdmin: boolean
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PricingItemRow | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  function openNew() { setEditing(null); setError(""); setModalOpen(true) }
  function openEdit(item: PricingItemRow) { setEditing(item); setError(""); setModalOpen(true) }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (editing) formData.set("is_active", String(editing.is_active))
      const result = editing
        ? await updatePricing(editing.id, formData)
        : await createPricing(formData)
      if (result.error) setError(result.error)
      else setModalOpen(false)
    })
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this pricing item?")) return
    startTransition(async () => {
      const result = await deletePricing(id)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Pricing</h2>
          <p className="mt-1 text-sm text-muted-foreground">{items.length} service prices configured</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Add Price
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">No pricing items yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.length === 0 ? "Create categories first, then add pricing." : "Add your first pricing item."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Est. Time</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={cn("border-b border-border last:border-0 transition-colors hover:bg-muted/30", !item.is_active && "opacity-60")}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{item.service_name}</p>
                    {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.categories?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    {Number(item.price).toFixed(2)} <span className="text-xs text-muted-foreground">{item.currency}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {item.estimated_minutes ? (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{item.estimated_minutes}m</span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", item.is_active ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground")}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Price" : "Add Price"}>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">{error}</div>}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Category</label>
            <select name="category_id" required defaultValue={editing?.category_id ?? ""} className={inputClass}>
              <option value="" disabled>Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Service Name</label>
            <input name="service_name" required defaultValue={editing?.service_name ?? ""} className={inputClass} placeholder="e.g. Left Stick Module Replacement" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Description</label>
            <input name="description" defaultValue={editing?.description ?? ""} className={inputClass} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Price (RON)</label>
              <input name="price" type="number" step="0.01" min="0" required defaultValue={editing ? Number(editing.price) : ""} className={inputClass} placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Est. Minutes</label>
              <input name="estimated_minutes" type="number" min="1" defaultValue={editing?.estimated_minutes ?? ""} className={inputClass} placeholder="30" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnOutline}>Cancel</button>
            <button type="submit" disabled={isPending} className={btnPrimary}>
              {isPending ? "Saving..." : editing ? "Update" : "Add Price"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
