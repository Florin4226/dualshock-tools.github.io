import { createClient } from "@/lib/supabase/server"
import { CategoriesClient } from "./categories-client"

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single()

  return <CategoriesClient categories={categories ?? []} isAdmin={profile?.role === "admin"} />
}
