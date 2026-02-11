import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const userProfile = {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? user.email ?? "User",
    role: (profile?.role as "admin" | "technician") ?? "technician",
    avatarUrl: profile?.avatar_url ?? null,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={userProfile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={userProfile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
