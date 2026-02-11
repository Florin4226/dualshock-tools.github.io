import Link from "next/link"
import { Plus, Search, FileText, FolderOpen } from "lucide-react"

const actions = [
  {
    title: "Add Device",
    description: "Register a new device for service",
    href: "/dashboard/devices",
    icon: Plus,
  },
  {
    title: "New Service Record",
    description: "Create a new service entry",
    href: "/dashboard/services",
    icon: FileText,
  },
  {
    title: "Search Devices",
    description: "Find a device by serial number",
    href: "/dashboard/devices",
    icon: Search,
  },
  {
    title: "Manage Categories",
    description: "View and edit service categories",
    href: "/dashboard/categories",
    icon: FolderOpen,
  },
]

export function QuickActions() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold text-card-foreground">
          Quick Actions
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="flex items-center gap-4 bg-card p-4 transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <action.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-card-foreground">
                {action.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
