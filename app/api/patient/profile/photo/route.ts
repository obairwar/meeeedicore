import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getCloudinary } from "@/lib/cloudinary"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 })
  }
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Max 3MB" }, { status: 400 })
  const mime = file.type || "application/octet-stream"
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
    return NextResponse.json({ error: "PNG, JPEG, or WebP only" }, { status: 400 })
  }

  const cloud = getCloudinary()
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ error: "Upload not configured" }, { status: 503 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const dataUri = `data:${mime};base64,${base64}`

  const uploaded = await cloud.uploader.upload(dataUri, {
    folder: "hospital/profiles",
    resource_type: "image",
  })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { photoUrl: uploaded.secure_url },
  })

  return NextResponse.json({ photoUrl: uploaded.secure_url })
}
