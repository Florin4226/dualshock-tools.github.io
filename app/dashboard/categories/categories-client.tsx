"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { createCategory, updateCategory, deleteCategory } from "../actions"
import type { Category } from "@/lib/types"
import { DEVICE_TYPE_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const labelClass = "text-sm font-medium text-foreground"
const btnPrimary =
  "flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
const btnOutline =
  "flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"

export function CategoriesClient({ categories, isAdmin }: { categories: Category[]; isAdmin: boolean }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  function openNew() { setEditing(null); setError(""); setModalOpen(true) }
  function openEdit(cat: Category) { setEditing(cat); setError(""); setModalOpen(true) }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (editing) formData.set("is_active", String(editing.is_active))
      const result = editing
        ? await updateCategory(editing.id, formData)
        : await createCategory(formData)
      if (result.error) setError(result.error)
      else setModalOpen(false)
    })
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this category? This will also remove all linked pricing items.")) return
    startTransition(async () => {
      const result = await deleteCategory(id)
      if (result.error) setError(result.error)
    })
  }

  function handleToggle(cat: Category) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("name", cat.name)
      fd.set("description", cat.description ?? "")
      fd.set("device_type", cat.device_type)
      fd.set("is_active", String(!cat.is_active))
      await updateCategory(cat.id, fd)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">{categories.length} service categories</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Add Category
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first service category to organize pricing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className={cn("rounded-lg border border-border p-5 transition-colors", !cat.is_active && "opacity-60")}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{cat.name}</h3>
                    {!cat.is_active && (
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactive</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{cat.description || "No description"}</p>
                  <span className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {DEVICE_TYPE_LABELS[cat.device_type]}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(cat)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" title={cat.is_active ? "Deactivate" : "Activate"}>
                      <div className={cn("h-2.5 w-2.5 rounded-full", cat.is_active ? "bg-green-500" : "bg-muted-foreground")} />
                    </button>
                    <button onClick={() => openEdit(cat)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"}>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">{error}</div>}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Name</label>
            <input name="name" required defaultValue={editing?.name ?? ""} className={inputClass} placeholder="e.g. Stick Drift Repair" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Description</label>
            <textarea name="description" defaultValue={editing?.description ?? ""} rows={2} className={cn(inputClass, "h-auto resize-none")} placeholder="Optional description..." />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Device Type</label>
            <select name="device_type" required defaultValue={editing?.device_type ?? "all"} className={inputClass}>
              <option value="all">All Devices</option>
              <option value="playstation_controller">PlayStation Controller</option>
              <option value="other_controller">Other Controller</option>
              <option value="console">Console</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnOutline}>Cancel</button>
            <button type="submit" disabled={isPending} className={btnPrimary}>
              {isPending ? "Saving..." : editing ? "Update" : "Add Category"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
