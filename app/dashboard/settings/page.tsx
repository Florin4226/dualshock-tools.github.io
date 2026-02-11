import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        Platform Settings
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        Configure platform settings, company details, notification preferences, and system defaults.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Coming soon</p>
    </div>
  )
}
