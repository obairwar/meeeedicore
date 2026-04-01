"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

type Props = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
}

/** next/image with support for data: URLs (QR, inline data). */
export function SafeImage({ src, alt, width, height, className, priority }: Props) {
  const isData = src.startsWith("data:")
  if (isData) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(className)}
        unoptimized
        priority={priority}
      />
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn(className)}
      priority={priority}
    />
  )
}
