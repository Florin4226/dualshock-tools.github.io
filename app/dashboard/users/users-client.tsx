"use client"

import { useState, useTransition } from "react"
import { Plus, UserPlus, Shield, Wrench } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { inviteUser, updateUserRole } from "../actions"
import { cn } from "@/lib/utils"

interface ProfileRow {
  id: string
  full_name: string | null
  role: string
  avatar_url: string | null
  created_at: string
}

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const labelClass = "text-sm font-medium text-foreground"
const btnPrimary =
  "flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
const btnOutline =
  "flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"

export function UsersClient({ profiles, currentUserId }: { profiles: ProfileRow[]; currentUserId: string }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError("")
      setSuccess("")
      const result = await inviteUser(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess("User account created. They should check their email to confirm, then log in.")
        setTimeout(() => { setModalOpen(false); setSuccess("") }, 3000)
      }
    })
  }

  function handleRoleChange(userId: string, newRole: string) {
    if (!confirm(`Change this user's role to ${newRole}?`)) return
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">User Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">{profiles.length} team members</p>
        </div>
        <button onClick={() => { setModalOpen(true); setError(""); setSuccess("") }} className={btnPrimary}>
          <UserPlus className="h-4 w-4" /> Create User
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <div key={profile.id} className="rounded-lg border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {(profile.full_name ?? "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-foreground">{profile.full_name ?? "Unnamed"}</p>
                <div className="mt-1 flex items-center gap-2">
                  {profile.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <Wrench className="h-3 w-3" /> Technician
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {profile.id !== currentUserId && (
              <div className="mt-4 border-t border-border pt-3">
                <button
                  onClick={() => handleRoleChange(profile.id, profile.role === "admin" ? "technician" : "admin")}
                  className={cn(btnOutline, "h-8 w-full text-xs")}
                  disabled={isPending}
                >
                  {profile.role === "admin" ? "Demote to Technician" : "Promote to Admin"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New User">
        <form action={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">{error}</div>}
          {success && <div className="rounded-md bg-green-500/10 border border-green-500/50 p-3 text-sm text-green-500">{success}</div>}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Full Name</label>
            <input name="full_name" required className={inputClass} placeholder="John Doe" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Email</label>
            <input name="email" type="email" required className={inputClass} placeholder="user@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Temporary Password</label>
            <input name="password" type="password" required minLength={6} className={inputClass} placeholder="Min 6 characters" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Role</label>
            <select name="role" defaultValue="technician" className={inputClass}>
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnOutline}>Cancel</button>
            <button type="submit" disabled={isPending} className={btnPrimary}>
              {isPending ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
