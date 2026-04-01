/** Unwraps standardized API responses `{ success, data, error }` with backward compatibility for legacy shapes. */
export async function unwrapApi<T>(res: Response): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const raw = await res.json().catch(() => null)
  if (raw && typeof raw === "object" && "success" in raw) {
    const o = raw as { success?: boolean; data?: T; error?: string }
    if (o.success && "data" in o) return { ok: true, data: o.data as T }
    return { ok: false, error: o.error ?? "Request failed", status: res.status }
  }
  if (!res.ok) {
    const err = (raw as { error?: string } | null)?.error ?? `Request failed (${res.status})`
    return { ok: false, error: err, status: res.status }
  }
  return { ok: true, data: raw as T }
}
