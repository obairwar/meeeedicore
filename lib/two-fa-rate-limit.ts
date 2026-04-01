const attempts = new Map<string, { count: number; lockedUntil: number }>()

const MAX = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000

export function check2faRateLimit(key: string): { ok: true } | { ok: false; lockedUntil: number } {
  const now = Date.now()
  const row = attempts.get(key)
  if (row && row.lockedUntil > now) {
    return { ok: false, lockedUntil: row.lockedUntil }
  }
  if (row && row.lockedUntil <= now) {
    attempts.delete(key)
  }
  return { ok: true }
}

export function record2faFailure(key: string) {
  const now = Date.now()
  const row = attempts.get(key)
  const count = (row?.count ?? 0) + 1
  if (count >= MAX) {
    attempts.set(key, { count, lockedUntil: now + LOCK_MS })
  } else {
    attempts.set(key, { count, lockedUntil: 0 })
  }
}

export function clear2faAttempts(key: string) {
  attempts.delete(key)
}
