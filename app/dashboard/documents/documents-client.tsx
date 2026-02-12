"use client"

import { useState } from "react"
import { FileText, Download, Printer, ClipboardList } from "lucide-react"
import { STATUS_LABELS, STATUS_COLORS, DEVICE_TYPE_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RecordRow {
  id: string
  status: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  diagnosis: string | null
  work_performed: string | null
  parts_used: string | null
  total_price: number
  currency: string
  created_at: string
  completed_at: string | null
  devices: { serial_number: string; device_type: string; brand: string | null; model: string | null } | null
  pricing: { service_name: string; price: number } | null
  technician: { full_name: string } | null
}

function generateReportHTML(record: RecordRow) {
  return `<!DOCTYPE html>
<html><head><title>Service Report - ${record.devices?.serial_number ?? "N/A"}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #111; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 32px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; color: #666; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .field { margin-bottom: 6px; }
  .label { font-weight: 600; font-size: 13px; }
  .value { font-size: 14px; }
  .total { font-size: 20px; font-weight: 700; text-align: right; margin-top: 24px; padding-top: 16px; border-top: 2px solid #111; }
  .footer { margin-top: 48px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <h1>ByteBurst Technology SRL</h1>
  <p class="subtitle">Service Report</p>
  <div class="grid">
    <div class="section">
      <div class="section-title">Device Information</div>
      <div class="field"><span class="label">Serial: </span><span class="value">${record.devices?.serial_number ?? "N/A"}</span></div>
      <div class="field"><span class="label">Type: </span><span class="value">${DEVICE_TYPE_LABELS[record.devices?.device_type ?? ""] ?? "N/A"}</span></div>
      <div class="field"><span class="label">Brand: </span><span class="value">${record.devices?.brand ?? "N/A"}</span></div>
      <div class="field"><span class="label">Model: </span><span class="value">${record.devices?.model ?? "N/A"}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Customer Information</div>
      <div class="field"><span class="label">Name: </span><span class="value">${record.customer_name ?? "N/A"}</span></div>
      <div class="field"><span class="label">Phone: </span><span class="value">${record.customer_phone ?? "N/A"}</span></div>
      <div class="field"><span class="label">Email: </span><span class="value">${record.customer_email ?? "N/A"}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Service Details</div>
    <div class="field"><span class="label">Service: </span><span class="value">${record.pricing?.service_name ?? "Custom Service"}</span></div>
    <div class="field"><span class="label">Status: </span><span class="value">${STATUS_LABELS[record.status] ?? record.status}</span></div>
    <div class="field"><span class="label">Technician: </span><span class="value">${record.technician?.full_name ?? "N/A"}</span></div>
    <div class="field"><span class="label">Date: </span><span class="value">${new Date(record.created_at).toLocaleDateString()}</span></div>
    ${record.completed_at ? `<div class="field"><span class="label">Completed: </span><span class="value">${new Date(record.completed_at).toLocaleDateString()}</span></div>` : ""}
  </div>
  <div class="section">
    <div class="section-title">Diagnosis</div>
    <p class="value">${record.diagnosis ?? "No diagnosis recorded."}</p>
  </div>
  <div class="section">
    <div class="section-title">Work Performed</div>
    <p class="value">${record.work_performed ?? "No work details recorded."}</p>
  </div>
  <div class="section">
    <div class="section-title">Parts Used</div>
    <p class="value">${record.parts_used ?? "No parts recorded."}</p>
  </div>
  <div class="total">Total: ${Number(record.total_price).toFixed(2)} ${record.currency}</div>
  <div class="footer">
    <p>ByteBurst Technology SRL &mdash; Service Report</p>
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  </div>
</body></html>`
}

export function DocumentsClient({ records }: { records: RecordRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = records.find((r) => r.id === selectedId)

  function handlePrint(record: RecordRow) {
    const html = generateReportHTML(record)
    const win = window.open("", "_blank")
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }

  function handleDownload(record: RecordRow) {
    const html = generateReportHTML(record)
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `service-report-${record.devices?.serial_number ?? record.id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">Generate service reports for completed and in-progress records.</p>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">No records available</p>
          <p className="mt-1 text-sm text-muted-foreground">Complete or start service records to generate documents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Record list */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">{records.length} records</p>
              </div>
              <div className="flex flex-col divide-y divide-border max-h-[600px] overflow-y-auto">
                {records.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      "flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedId === record.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium text-foreground">{record.devices?.serial_number}</span>
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[record.status])}>
                        {STATUS_LABELS[record.status]}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{record.customer_name ?? "No customer"} - {record.pricing?.service_name ?? "Custom"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Service Report Preview</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDownload(selected)} className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                    <button onClick={() => handlePrint(selected)} className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-foreground">ByteBurst Technology SRL</h3>
                    <p className="text-sm text-muted-foreground">Service Report</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Device</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Serial:</span> {selected.devices?.serial_number}</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Type:</span> {DEVICE_TYPE_LABELS[selected.devices?.device_type ?? ""]}</p>
                      <p className="text-sm text-foreground"><span className="font-medium">Brand:</span> {selected.devices?.brand ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
                      <p className="text-sm text-foreground">{selected.customer_name ?? "N/A"}</p>
                      <p className="text-sm text-foreground">{selected.customer_phone ?? "N/A"}</p>
                      <p className="text-sm text-foreground">{selected.customer_email ?? "N/A"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Diagnosis</p>
                      <p className="text-sm text-foreground">{selected.diagnosis || "No diagnosis recorded."}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Work Performed</p>
                      <p className="text-sm text-foreground">{selected.work_performed || "No work details recorded."}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Parts Used</p>
                      <p className="text-sm text-foreground">{selected.parts_used || "No parts recorded."}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted-foreground">Technician: {selected.technician?.full_name ?? "N/A"}</span>
                    <span className="text-xl font-bold text-foreground">{Number(selected.total_price).toFixed(2)} {selected.currency}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium text-foreground">Select a record</p>
                <p className="mt-1 text-sm text-muted-foreground">Choose a service record from the list to preview and generate documents.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
