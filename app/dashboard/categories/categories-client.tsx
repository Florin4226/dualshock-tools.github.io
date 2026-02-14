"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, FolderOpen, Folder, ChevronRight, ChevronDown, Search } from "lucide-react"
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

interface TreeCategory extends Category {
  children: TreeCategory[]
}

function buildTree(flat: Category[]): TreeCategory[] {
  const map = new Map<string, TreeCategory>()
  const roots: TreeCategory[] = []
  flat.forEach(c => map.set(c.id, { ...c, children: [] }))
  flat.forEach(c => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function getDescendantIds(categories: Category[], id: string): string[] {
  const ids = [id]
  categories.filter(c => c.parent_id === id).forEach(child => {
    ids.push(...getDescendantIds(categories, child.id))
  })
  return ids
}

function CategoryNode({
  cat,
  depth,
  onEdit,
  onDelete,
  onAddSub,
}: {
  cat: TreeCategory
  depth: number
  onEdit: (c: Category) => void
  onDelete: (id: string) => void
  onAddSub: (parentId: string) => void
}) {
  const [open, setOpen] = useState(depth === 0)
  const hasSubs = cat.children.length > 0

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/40",
          !cat.is_active && "opacity-50"
        )}
        style={{ marginLeft: depth * 24 }}
      >
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
        >
          {hasSubs ? (
            open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : depth > 0 ? (
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
        </button>

        {hasSubs && (
          open
            ? <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            : <Folder className="h-4 w-4 shrink-0 text-primary" />
        )}

        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <span className="truncate font-medium text-sm">{cat.name}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {DEVICE_TYPE_LABELS[cat.device_type] || cat.device_type}
          </span>
          {!cat.is_active && (
            <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              Inactive
            </span>
          )}
          {cat.description && (
            <span className="hidden text-xs text-muted-foreground lg:block max-w-[200px] truncate">
              {cat.description}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onAddSub(cat.id)}
            title="Add subcategory"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(cat)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(cat.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {hasSubs && open && (
        <div className="mt-1 flex flex-col gap-1">
          {cat.children.map(sub => (
            <CategoryNode
              key={sub.id}
              cat={sub}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSub={onAddSub}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoriesClient({ categories, isAdmin }: { categories: Category[]; isAdmin: boolean }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const tree = buildTree(categories)
  const filteredTree = search
    ? buildTree(
        categories.filter(
          c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.description || "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : tree

  function openNew(parentId?: string) {
    setEditing(null)
    setParentIdForNew(parentId || null)
    setError("")
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setParentIdForNew(null)
    setError("")
    setModalOpen(true)
  }

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
    if (!confirm("Delete this category and all its subcategories?")) return
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
      fd.set("parent_id", cat.parent_id ?? "")
      fd.set("is_active", String(!cat.is_active))
      await updateCategory(cat.id, fd)
    })
  }

  const parentCat = parentIdForNew ? categories.find(c => c.id === parentIdForNew) : null
  const excludedIds = editing ? getDescendantIds(categories, editing.id) : []
  const possibleParents = categories.filter(c => !excludedIds.includes(c.id))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <button onClick={() => openNew()} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first service category to organize pricing.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {search ? `Results for "${search}"` : "All Categories"}
              <span className="ml-2 font-normal text-muted-foreground">({categories.length} total)</span>
            </p>
          </div>
          <div className="flex flex-col gap-1 p-3">
            {filteredTree.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No categories match your search.</p>
            ) : (
              filteredTree.map(cat => (
                <CategoryNode
                  key={cat.id}
                  cat={cat}
                  depth={0}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onAddSub={id => openNew(id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : parentIdForNew ? `Add Subcategory under "${parentCat?.name || ""}"` : "Add Category"}>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">{error}</div>}

          <input type="hidden" name="parent_id" value={editing ? (editing.parent_id || "") : (parentIdForNew || "")} />

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
            <select name="device_type" required defaultValue={editing?.device_type ?? parentCat?.device_type ?? "all"} className={inputClass}>
              <option value="all">All Devices</option>
              <option value="playstation_controller">PlayStation Controller</option>
              <option value="other_controller">Other Controller</option>
              <option value="console">Console</option>
            </select>
          </div>

          {editing && (
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Parent Category</label>
              <select name="parent_id" defaultValue={editing.parent_id || ""} className={inputClass}>
                <option value="">None (Top Level)</option>
                {possibleParents.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cat-active" name="is_active" value="true" defaultChecked={editing.is_active} onChange={() => handleToggle(editing)} />
              <label htmlFor="cat-active" className={labelClass}>Active</label>
            </div>
          )}

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
