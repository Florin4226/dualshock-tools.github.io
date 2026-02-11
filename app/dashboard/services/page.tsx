import { ClipboardList } from "lucide-react"

export default function ServicesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        Service Records
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        Create and manage service records for device repairs. Track status, assign technicians, and log work performed.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Coming soon</p>
    </div>
  )
}
