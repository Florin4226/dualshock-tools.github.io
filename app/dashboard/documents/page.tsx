import { createClient } from "@/lib/supabase/server"
import { DocumentsClient } from "./documents-client"

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from("service_records")
    .select("*, devices(serial_number, device_type, brand, model), pricing(service_name, price), technician:profiles!service_records_technician_id_fkey(full_name)")
    .in("status", ["completed", "in_progress"])
    .order("created_at", { ascending: false })

  return <DocumentsClient records={records ?? []} />
}
