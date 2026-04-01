import type { BillBreakdown } from "@/lib/payment-breakdown"
import { formatCurrency } from "@/lib/utils"

export function buildInvoiceHtml(params: {
  hospitalName: string
  patientName: string
  patientEmail: string
  doctorName: string
  departmentName: string
  appointmentDate: string
  tokenCode: string
  breakdown: BillBreakdown
  transactionId: string
  paidAt: string
}): string {
  const rows = [
    `<tr><td>Consultation Fee</td><td style="text-align:right">${formatCurrency(params.breakdown.consultationFee)}</td></tr>`,
    ...params.breakdown.labItems.map(
      (l) => `<tr><td>Lab: ${escapeHtml(l.name)}</td><td style="text-align:right">${formatCurrency(l.amount)}</td></tr>`
    ),
    `<tr><td>Tax (${params.breakdown.taxRate * 100}%)</td><td style="text-align:right">${formatCurrency(params.breakdown.tax)}</td></tr>`,
    `<tr><th>Total</th><th style="text-align:right">${formatCurrency(params.breakdown.total)}</th></tr>`,
  ].join("")

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111}
.header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #0369a1;padding-bottom:12px;margin-bottom:16px}
.logo{width:48px;height:48px;background:#0369a1;border-radius:8px}
table{width:100%;border-collapse:collapse;margin-top:12px}
td,th{padding:8px;border-bottom:1px solid #e5e7eb}
.meta{font-size:13px;color:#444;margin:4px 0}
</style></head><body>
<div class="header">
  <div class="logo"></div>
  <div><div style="font-size:20px;font-weight:700">${escapeHtml(params.hospitalName)}</div>
  <div class="meta">Payment receipt / Tax invoice</div></div>
</div>
<p class="meta"><strong>Patient:</strong> ${escapeHtml(params.patientName)} (${escapeHtml(params.patientEmail)})</p>
<p class="meta"><strong>Doctor:</strong> ${escapeHtml(params.doctorName)} — ${escapeHtml(params.departmentName)}</p>
<p class="meta"><strong>Appointment:</strong> ${escapeHtml(params.appointmentDate)} · Token ${escapeHtml(params.tokenCode)}</p>
<table>
<thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p class="meta" style="margin-top:16px"><strong>Transaction ID:</strong> ${escapeHtml(params.transactionId)}</p>
<p class="meta"><strong>Paid at:</strong> ${escapeHtml(params.paidAt)}</p>
<p class="meta" style="margin-top:24px;font-size:11px;color:#666">This is a computer-generated document.</p>
</body></html>`
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
