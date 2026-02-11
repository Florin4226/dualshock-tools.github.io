import { DollarSign } from "lucide-react"

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <DollarSign className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        Pricing Management
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        Set and manage pricing for all service categories. Configure repair costs, labor rates, and parts pricing.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Coming soon</p>
    </div>
  )
}
