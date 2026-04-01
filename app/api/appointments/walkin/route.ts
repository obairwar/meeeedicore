import { auth } from "@/lib/auth"

import { POST as appointmentsPost } from "../route"

/** Receptionist walk-in — delegates to main appointment creator (same validation + queue). */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "RECEPTIONIST") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }
  return appointmentsPost(req)
}
