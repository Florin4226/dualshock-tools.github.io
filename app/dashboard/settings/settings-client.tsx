"use client"

import { Database, Users, Laptop, ClipboardList, FolderOpen } from "lucide-react"

interface Stats { devices: number; records: number; categories: number; users: number }
interface Profile { id: string; full_name: string; role: string; created_at: string }

export function SettingsClient({ stats, profile }: { stats: Stats; profile: Profile }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Platform overview and system information.</p>
      </div>

      {/* Company info */}
      <div className="rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Company</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Company Name</p>
            <p className="text-foreground font-medium">ByteBurst Technology SRL</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Platform Version</p>
            <p className="text-foreground font-medium">1.0.0</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Logged in as</p>
            <p className="text-foreground font-medium">{profile.full_name} ({profile.role})</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account created</p>
            <p className="text-foreground font-medium">{new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Database stats */}
      <div className="rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Database Overview</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <Laptop className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.devices}</p>
              <p className="text-xs text-muted-foreground">Devices</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.records}</p>
              <p className="text-xs text-muted-foreground">Records</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <FolderOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.categories}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.users}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">System Info</h3>
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-foreground font-medium">Supabase PostgreSQL</p>
            <p className="text-xs text-muted-foreground">Cloud-hosted database with Row Level Security enabled on all tables.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
