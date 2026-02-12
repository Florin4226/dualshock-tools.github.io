import { createClient } from "@/lib/supabase/server"
import { ServicesClient } from "./services-client"

export default async function ServicesPage() {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from("service_records")
    .select("*, devices(serial_number, device_type, brand, model), pricing(service_name, price), technician:profiles!service_records_technician_id_fkey(full_name)")
    .order("created_at", { ascending: false })

  const { data: devices } = await supabase
    .from("devices")
    .select("id, serial_number, device_type, brand, model")
    .order("serial_number")

  const { data: pricingItems } = await supabase
    .from("pricing")
    .select("id, service_name, price, category_id")
    .eq("is_active", true)
    .order("service_name")

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single()

  return (
    <ServicesClient
      records={records ?? []}
      devices={devices ?? []}
      pricingItems={pricingItems ?? []}
      isAdmin={profile?.role === "admin"}
    />
  )
}
