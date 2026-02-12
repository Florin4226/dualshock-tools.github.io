export interface UserProfile {
  id: string
  email: string
  fullName: string
  role: "admin" | "technician"
  avatarUrl: string | null
}

export interface Device {
  id: string
  serial_number: string
  device_type: "playstation_controller" | "other_controller" | "console"
  brand: string | null
  model: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  device_type: "playstation_controller" | "other_controller" | "console" | "all"
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PricingItem {
  id: string
  category_id: string
  service_name: string
  description: string | null
  price: number
  currency: string
  estimated_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  categories?: Category
}

export interface ServiceRecord {
  id: string
  device_id: string
  pricing_id: string | null
  status: "pending" | "in_progress" | "completed" | "cancelled"
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  diagnosis: string | null
  work_performed: string | null
  parts_used: string | null
  total_price: number
  currency: string
  technician_id: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  devices?: Device
  pricing?: PricingItem
  technician?: { full_name: string }
}

export const DEVICE_TYPE_LABELS: Record<string, string> = {
  playstation_controller: "PlayStation Controller",
  other_controller: "Other Controller",
  console: "Console",
  all: "All Devices",
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  in_progress: "bg-blue-500/10 text-blue-500",
  completed: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
}
