import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      department: true,
      feedbacks: {
        where: { anonymous: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { patient: { select: { name: true } } },
      },
    },
  })
  if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: doctor.id,
    name: doctor.name,
    specialization: doctor.specialization,
    experienceYears: doctor.experienceYears,
    rating: doctor.rating,
    ratingCount: doctor.ratingCount,
    consultationFee: doctor.consultationFee,
    bio: doctor.bio,
    photoUrl: doctor.photoUrl,
    department: doctor.department,
    reviews: doctor.feedbacks.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      createdAt: f.createdAt.toISOString(),
      patientName: f.anonymous ? "Anonymous" : f.patient.name,
    })),
  })
}
