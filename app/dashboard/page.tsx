import { Laptop, ClipboardList, FolderOpen, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: deviceCount },
    { count: activeCount },
    { count: categoryCount },
    { count: pendingCount },
    { data: recentRecords },
  ] = await Promise.all([
    supabase.from("devices").select("*", { count: "exact", head: true }),
    supabase.from("service_records").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("categories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("service_records").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("service_records")
      .select("id, status, total_price, currency, created_at, devices(serial_number), pricing(service_name), technician:profiles!service_records_technician_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground text-balance">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {"Here's an overview of your service platform activity."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Devices" value={deviceCount ?? 0} description="Registered devices" icon={Laptop} />
        <StatCard title="Active Services" value={activeCount ?? 0} description="In progress" icon={ClipboardList} />
        <StatCard title="Categories" value={categoryCount ?? 0} description="Active categories" icon={FolderOpen} />
        <StatCard title="Pending" value={pendingCount ?? 0} description="Awaiting action" icon={AlertCircle} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivity records={recentRecords ?? []} />
        <QuickActions />
      </div>
    </div>
  )
}
