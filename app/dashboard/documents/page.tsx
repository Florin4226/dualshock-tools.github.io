import { createClient } from "@/lib/supabase/server"
import { DocumentsClient } from "./documents-client"

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from("service_records")
    .select("id, status, customer_name, customer_phone, customer_email, diagnosis, work_performed, parts_used, total_price, currency, created_at, completed_at, device_id, pricing_id, technician_id, devices(serial_number, device_type, brand, model), pricing(service_name, price)")
    .order("created_at", { ascending: false })

  // Fetch technician names separately to avoid FK alias issues
  const techIds = [...new Set((records ?? []).map((r) => r.technician_id))]
  const { data: techs } = techIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", techIds)
    : { data: [] }

  const techMap = new Map((techs ?? []).map((t) => [t.id, t.full_name]))

  const enriched = (records ?? []).map((r) => ({
    ...r,
    technician: { full_name: techMap.get(r.technician_id) ?? "Unknown" },
  }))

  return <DocumentsClient records={enriched} />
}
