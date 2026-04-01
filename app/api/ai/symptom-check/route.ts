import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  text: z.string().min(5),
})

function heuristic(text: string) {
  const t = text.toLowerCase()
  if (t.includes("chest") || t.includes("heart") || t.includes("bp") || t.includes("palp")) return { code: "CARD", priority: "HIGH" as const }
  if (t.includes("head") || t.includes("migraine") || t.includes("seiz")) return { code: "NEURO", priority: "HIGH" as const }
  if (t.includes("bone") || t.includes("knee") || t.includes("fract") || t.includes("back")) return { code: "ORTHO", priority: "MEDIUM" as const }
  if (t.includes("child") || t.includes("baby") || t.includes("fever")) return { code: "PEDS", priority: "MEDIUM" as const }
  if (t.includes("ear") || t.includes("throat") || t.includes("nose") || t.includes("sinus")) return { code: "ENT", priority: "LOW" as const }
  return { code: "GEN", priority: "LOW" as const }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const suggestion = heuristic(parsed.data.text)
  const dept = await prisma.department.findUnique({ where: { code: suggestion.code } })

  return NextResponse.json({
    suggestedDepartment: dept ? { id: dept.id, code: dept.code, name: dept.name, floor: dept.floor } : null,
    urgency: suggestion.priority,
    rationale: "AI symptom check is mocked for now (heuristic).",
  })
}

