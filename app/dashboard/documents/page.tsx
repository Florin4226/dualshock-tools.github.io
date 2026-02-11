import { FileText } from "lucide-react"

export default function DocumentsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        Document Generation
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        Generate service reports, invoices, and repair documentation. Export to PDF for customer records.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Coming soon</p>
    </div>
  )
}
