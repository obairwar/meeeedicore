"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

/** Circular avatar using next/image fill (HTTPS or data URLs). */
export function AvatarImage({
  src,
  alt,
  size,
  className,
}: {
  src: string
  alt: string
  size: number
  className?: string
}) {
  const isData = src.startsWith("data:")
  const onConfiguredCdn = src.includes("cloudinary.com")
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full bg-slate-200", className)} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
        unoptimized={isData || !onConfiguredCdn}
      />
    </div>
  )
}
