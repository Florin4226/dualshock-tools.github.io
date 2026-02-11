import { Users } from "lucide-react"

export default function UsersPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        User Management
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        Manage team members, assign roles, and control access permissions. Admin only.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Coming soon</p>
    </div>
  )
}
