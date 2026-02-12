import { ClipboardList } from "lucide-react"
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RecentRecord {
  id: string
  status: string
  total_price: number
  currency: string
  created_at: string
  devices: { serial_number: string } | null
  pricing: { service_name: string } | null
  technician: { full_name: string } | null
}

export function RecentActivity({ records }: { records: RecentRecord[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold text-card-foreground">
          Recent Activity
        </h2>
        <span className="text-xs text-muted-foreground">Latest records</span>
      </div>
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-card-foreground">
            No recent activity
          </h3>
          <p className="mt-1 text-xs text-muted-foreground text-pretty">
            Service records will appear here once you start adding data.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {records.map((record) => (
            <div key={record.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-card-foreground font-mono">
                    {record.devices?.serial_number ?? "Unknown"}
                  </span>
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[record.status])}>
                    {STATUS_LABELS[record.status]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {record.pricing?.service_name ?? "Custom"} - {record.technician?.full_name ?? "Unassigned"}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold font-mono text-card-foreground">
                  {Number(record.total_price).toFixed(2)} {record.currency}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(record.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
