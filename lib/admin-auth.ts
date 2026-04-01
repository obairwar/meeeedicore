import { auth } from "@/lib/auth"

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") return null
  return session
}

export function getClientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for")
  if (xf) return xf.split(",")[0]?.trim() ?? null
  const real = req.headers.get("x-real-ip")
  if (real) return real
  return null
}
