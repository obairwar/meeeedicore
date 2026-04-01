type LabLine = { testName: string; status: string; resultUrl: string | null }
type RxLine = { medicineName: string; dosage: string; frequency: string; duration: string }

export type TimelineRecord = {
  id: string
  createdAt: string
  summary: string
  diagnosis: string | null
  notes: string | null
  followUpAt: string | null
  doctorName: string
  departmentName: string
  familyMemberName: string | null
  prescriptions: RxLine[]
  labOrders: LabLine[]
  prescriptionQrData: string | null
}

export function buildMedicalHistoryCoverHtml(hospitalName: string, patientName: string, generatedAt: string) {
  return `<div style="page-break-after:always;padding:48px;font-family:system-ui,sans-serif">
<h1 style="font-size:28px;color:#0369a1">${escape(hospitalName)}</h1>
<h2 style="margin-top:32px">Medical history export</h2>
<p style="color:#444">${escape(patientName)}</p>
<p style="font-size:13px;color:#666">Generated: ${escape(generatedAt)}</p>
</div>`
}

export function buildMedicalHistoryTimelineHtml(records: TimelineRecord[], qrDataUrlByRecordId: Record<string, string>) {
  const blocks = records.map((r) => {
    const qr = qrDataUrlByRecordId[r.id] ?? ""
    const rxRows = r.prescriptions
      .map(
        (p) =>
          `<tr><td>${escape(p.medicineName)}</td><td>${escape(p.dosage)}</td><td>${escape(p.frequency)}</td><td>${escape(p.duration)}</td></tr>`
      )
      .join("")
    const labRows = r.labOrders
      .map(
        (l) =>
          `<tr><td>${escape(l.testName)}</td><td>${escape(l.status)}</td><td>${l.resultUrl ? escape(l.resultUrl) : "—"}</td></tr>`
      )
      .join("")
    return `<section style="margin-bottom:32px;page-break-inside:avoid;border-left:4px solid #0369a1;padding-left:16px">
<div style="font-weight:700;color:#0369a1">${escape(r.createdAt)}</div>
<div style="margin-top:8px"><strong>${escape(r.doctorName)}</strong> · ${escape(r.departmentName)}${
      r.familyMemberName ? ` · For: ${escape(r.familyMemberName)}` : ""
    }</div>
<p style="margin:8px 0"><strong>Summary:</strong> ${escape(r.summary)}</p>
${r.diagnosis ? `<p><strong>Diagnosis:</strong> ${escape(r.diagnosis)}</p>` : ""}
${r.notes ? `<p><strong>Notes:</strong> ${escape(r.notes)}</p>` : ""}
${r.followUpAt ? `<p><strong>Follow-up:</strong> ${escape(r.followUpAt)}</p>` : ""}
${r.prescriptions.length ? `<h4 style="margin:12px 0 4px">Prescriptions</h4><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th align="left">Medicine</th><th align="left">Dosage</th><th align="left">Freq</th><th align="left">Duration</th></tr></thead><tbody>${rxRows}</tbody></table>` : ""}
${qr ? `<div style="margin-top:8px"><img src="${qr}" width="96" height="96" alt="QR" /></div>` : ""}
${r.labOrders.length ? `<h4 style="margin:12px 0 4px">Lab</h4><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th align="left">Test</th><th align="left">Status</th><th align="left">Result</th></tr></thead><tbody>${labRows}</tbody></table>` : ""}
</section>`
  })
  return `<div style="padding:24px;font-family:system-ui,sans-serif;font-size:13px">${blocks.join("")}</div>`
}

function escape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
