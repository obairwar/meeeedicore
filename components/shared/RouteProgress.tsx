"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import NProgress from "nprogress"

import "nprogress/nprogress.css"

export function RouteProgress() {
  const pathname = usePathname()

  useEffect(() => {
    NProgress.configure({ showSpinner: false, trickleSpeed: 200 })
  }, [])

  useEffect(() => {
    NProgress.start()
    const id = window.setTimeout(() => NProgress.done(), 280)
    return () => window.clearTimeout(id)
  }, [pathname])

  return null
}
