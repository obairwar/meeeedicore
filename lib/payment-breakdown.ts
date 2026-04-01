export type LabLine = { name: string; amount: number }

export type BillBreakdown = {
  consultationFee: number
  labItems: LabLine[]
  taxRate: number
  subtotal: number
  tax: number
  total: number
}

export function defaultLabItems(): LabLine[] {
  return [
    { name: "CBC", amount: 300 },
    { name: "X-Ray", amount: 800 },
  ]
}

export function computeBill(consultationFee: number, labItems: LabLine[] = defaultLabItems(), taxRate = 0.05): BillBreakdown {
  const labSum = labItems.reduce((s, i) => s + i.amount, 0)
  const subtotal = consultationFee + labSum
  const tax = Math.round(subtotal * taxRate)
  const total = subtotal + tax
  return {
    consultationFee,
    labItems,
    taxRate,
    subtotal,
    tax,
    total,
  }
}

export function parseBreakdown(json: string | null | undefined): BillBreakdown | null {
  if (!json) return null
  try {
    const o = JSON.parse(json) as BillBreakdown
    if (typeof o.total === "number") return o
    return null
  } catch {
    return null
  }
}
