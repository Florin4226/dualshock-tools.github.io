import { ClipboardList } from "lucide-react"

export function RecentActivity() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold text-card-foreground">
          Recent Activity
        </h2>
        <span className="text-xs text-muted-foreground">Last 7 days</span>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-card-foreground">
          No recent activity
        </h3>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          Service records and device updates will appear here once you start
          adding data.
        </p>
      </div>
    </div>
  )
}
