import { createClient } from "@/lib/supabase/server"
import { ServicesClient } from "./services-client"

export default async function ServicesPage() {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from("service_records")
    .select("id, device_id, pricing_id, status, customer_name, customer_phone, customer_email, diagnosis, work_performed, parts_used, total_price, currency, technician_id, started_at, completed_at, created_at, quick_test_data, devices(serial_number, device_type, brand, model), pricing(service_name, price)")
    .order("created_at", { ascending: false })

  // Fetch technician names separately to avoid FK alias issues
  const techIds = [...new Set((records ?? []).map((r) => r.technician_id))]
  const { data: techs } = techIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", techIds)
    : { data: [] }

  const techMap = new Map((techs ?? []).map((t) => [t.id, t.full_name]))

  const enrichedRecords = (records ?? []).map((r) => ({
    ...r,
    technician: { full_name: techMap.get(r.technician_id) ?? "Unknown" },
  }))

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
      records={enrichedRecords}
      devices={devices ?? []}
      pricingItems={pricingItems ?? []}
      isAdmin={profile?.role === "admin"}
    />
  )
}
