import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { DevicesClient } from "./devices-client"

export default async function DevicesPage() {
  const supabase = await createClient()
  const { data: devices } = await supabase
    .from("devices")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single()

  return (
    <Suspense fallback={<div className="animate-pulse h-96 rounded-lg bg-muted" />}>
      <DevicesClient devices={devices ?? []} isAdmin={profile?.role === "admin"} />
    </Suspense>
  )
}
