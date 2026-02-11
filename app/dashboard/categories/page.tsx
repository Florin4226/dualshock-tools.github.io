import { FolderOpen } from "lucide-react"

export default function CategoriesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        Service Categories
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        Organize services into categories. Define device types, repair types, and service tiers.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Coming soon</p>
    </div>
  )
}
