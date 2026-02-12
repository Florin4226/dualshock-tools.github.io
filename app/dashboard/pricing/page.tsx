import { createClient } from "@/lib/supabase/server"
import { PricingClient } from "./pricing-client"

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: pricingItems } = await supabase
    .from("pricing")
    .select("*, categories(name, device_type)")
    .order("service_name", { ascending: true })

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name")

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single()

  return <PricingClient items={pricingItems ?? []} categories={categories ?? []} isAdmin={profile?.role === "admin"} />
}
