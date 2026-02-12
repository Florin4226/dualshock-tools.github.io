"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

// ── Helpers ──

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  return { supabase, user }
}

async function requireAdmin() {
  const { supabase, user } = await requireAuth()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") throw new Error("Admin access required")
  return { supabase, user }
}

// ── Devices ──

export async function createDevice(formData: FormData) {
  const { supabase, user } = await requireAuth()
  const { error } = await supabase.from("devices").insert({
    serial_number: formData.get("serial_number") as string,
    device_type: formData.get("device_type") as string,
    brand: (formData.get("brand") as string) || null,
    model: (formData.get("model") as string) || null,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  })
  if (error) return { error: error.message }
  revalidatePath("/dashboard/devices")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateDevice(id: string, formData: FormData) {
  const { supabase } = await requireAuth()
  const { error } = await supabase.from("devices").update({
    serial_number: formData.get("serial_number") as string,
    device_type: formData.get("device_type") as string,
    brand: (formData.get("brand") as string) || null,
    model: (formData.get("model") as string) || null,
    notes: (formData.get("notes") as string) || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/devices")
  return { success: true }
}

export async function deleteDevice(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("devices").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/devices")
  revalidatePath("/dashboard")
  return { success: true }
}

// ── Categories ──

export async function createCategory(formData: FormData) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("categories").insert({
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    device_type: formData.get("device_type") as string,
  })
  if (error) return { error: error.message }
  revalidatePath("/dashboard/categories")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateCategory(id: string, formData: FormData) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("categories").update({
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    device_type: formData.get("device_type") as string,
    is_active: formData.get("is_active") === "true",
    updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/categories")
  return { success: true }
}

export async function deleteCategory(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/categories")
  revalidatePath("/dashboard")
  return { success: true }
}

// ── Pricing ──

export async function createPricing(formData: FormData) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("pricing").insert({
    category_id: formData.get("category_id") as string,
    service_name: formData.get("service_name") as string,
    description: (formData.get("description") as string) || null,
    price: parseFloat(formData.get("price") as string),
    currency: "RON",
    estimated_minutes: formData.get("estimated_minutes") ? parseInt(formData.get("estimated_minutes") as string) : null,
  })
  if (error) return { error: error.message }
  revalidatePath("/dashboard/pricing")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function updatePricing(id: string, formData: FormData) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("pricing").update({
    category_id: formData.get("category_id") as string,
    service_name: formData.get("service_name") as string,
    description: (formData.get("description") as string) || null,
    price: parseFloat(formData.get("price") as string),
    estimated_minutes: formData.get("estimated_minutes") ? parseInt(formData.get("estimated_minutes") as string) : null,
    is_active: formData.get("is_active") === "true",
    updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/pricing")
  return { success: true }
}

export async function deletePricing(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("pricing").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/pricing")
  return { success: true }
}

// ── Service Records ──

export async function createServiceRecord(formData: FormData) {
  const { supabase, user } = await requireAuth()
  const { error } = await supabase.from("service_records").insert({
    device_id: formData.get("device_id") as string,
    pricing_id: (formData.get("pricing_id") as string) || null,
    customer_name: (formData.get("customer_name") as string) || null,
    customer_phone: (formData.get("customer_phone") as string) || null,
    customer_email: (formData.get("customer_email") as string) || null,
    diagnosis: (formData.get("diagnosis") as string) || null,
    total_price: parseFloat(formData.get("total_price") as string) || 0,
    technician_id: user.id,
    status: "pending",
  })
  if (error) return { error: error.message }
  revalidatePath("/dashboard/services")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateServiceRecord(id: string, formData: FormData) {
  const { supabase } = await requireAuth()
  const status = formData.get("status") as string
  const updateData: Record<string, unknown> = {
    status,
    customer_name: (formData.get("customer_name") as string) || null,
    customer_phone: (formData.get("customer_phone") as string) || null,
    customer_email: (formData.get("customer_email") as string) || null,
    diagnosis: (formData.get("diagnosis") as string) || null,
    work_performed: (formData.get("work_performed") as string) || null,
    parts_used: (formData.get("parts_used") as string) || null,
    total_price: parseFloat(formData.get("total_price") as string) || 0,
    updated_at: new Date().toISOString(),
  }
  if (status === "in_progress" && !formData.get("started_at")) {
    updateData.started_at = new Date().toISOString()
  }
  if (status === "completed" && !formData.get("completed_at")) {
    updateData.completed_at = new Date().toISOString()
  }
  const { error } = await supabase.from("service_records").update(updateData).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/services")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function deleteServiceRecord(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("service_records").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/services")
  revalidatePath("/dashboard")
  return { success: true }
}

// ── Users (Admin Only) ──

export async function inviteUser(formData: FormData) {
  const { supabase } = await requireAdmin()
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("full_name") as string
  const role = formData.get("role") as string

  const headersList = await headers()
  const origin = headersList.get("origin") || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  // Admin creates account on behalf of user
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        role: role || "technician",
      },
    },
  })
  if (error) return { error: error.message }
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function updateUserRole(userId: string, newRole: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("profiles").update({
    role: newRole,
    updated_at: new Date().toISOString(),
  }).eq("id", userId)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/users")
  return { success: true }
}
