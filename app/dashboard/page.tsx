import { Laptop, ClipboardList, FolderOpen, AlertCircle } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Welcome section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground text-balance">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {"Here's an overview of your service platform activity."}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Devices"
          value={0}
          description="Registered devices"
          icon={Laptop}
        />
        <StatCard
          title="Active Services"
          value={0}
          description="In progress"
          icon={ClipboardList}
        />
        <StatCard
          title="Categories"
          value={0}
          description="Service categories"
          icon={FolderOpen}
        />
        <StatCard
          title="Pending"
          value={0}
          description="Awaiting review"
          icon={AlertCircle}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivity />
        <QuickActions />
      </div>
    </div>
  )
}
