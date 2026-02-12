import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  const [
    { count: deviceCount },
    { count: recordCount },
    { count: categoryCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from("devices").select("*", { count: "exact", head: true }),
    supabase.from("service_records").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ])

  return (
    <SettingsClient
      stats={{ devices: deviceCount ?? 0, records: recordCount ?? 0, categories: categoryCount ?? 0, users: userCount ?? 0 }}
      profile={profile}
    />
  )
}
