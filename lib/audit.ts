import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/admin-auth"

export async function logAudit(
  userId: string | null,
  action: string,
  resource: string,
  details?: Record<string, unknown>,
  req?: Request
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        resource,
        detailsJson: details ? JSON.stringify(details) : undefined,
        ipAddress: req ? getClientIp(req) : undefined,
      },
    })
  } catch (e) {
    console.error("[audit log failed]", e)
  }
}
