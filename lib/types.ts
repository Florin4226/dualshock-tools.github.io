export interface UserProfile {
  id: string
  email: string
  fullName: string
  role: "admin" | "technician"
  avatarUrl: string | null
}

export interface NavItem {
  title: string
  href: string
  icon: string
  adminOnly?: boolean
}
