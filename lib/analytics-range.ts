export type DateRange = { from: Date; to: Date; label: string }

export function parseAnalyticsRange(searchParams: URLSearchParams): DateRange {
  const preset = searchParams.get("preset")
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")

  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (fromStr && toStr) {
    const from = new Date(fromStr)
    const to = new Date(toStr)
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { from, to, label: "custom" }
    }
  }

  let days = 30
  if (preset === "7") days = 7
  else if (preset === "90") days = 90
  else if (preset === "30") days = 30

  const from = new Date(end)
  from.setDate(from.getDate() - (days - 1))
  from.setHours(0, 0, 0, 0)

  return { from, to: end, label: `${days}d` }
}

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
