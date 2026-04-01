"use client"

import { useEffect, useRef, useState } from "react"

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/** Counts from previous value to `target` over `durationMs` (ease-out expo). */
export function useAnimatedCounter(target: number, durationMs = 1200, enabled = true) {
  const [display, setDisplay] = useState(0)
  const displayRef = useRef(0)

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    if (!enabled) {
      setDisplay(target)
      displayRef.current = target
      return
    }

    const from = displayRef.current
    let start: number | null = null
    let frame: number

    const step = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / durationMs)
      const e = easeOutExpo(t)
      const v = from + (target - from) * e
      displayRef.current = v
      setDisplay(v)
      if (t < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, enabled])

  return Math.round(display * 10) / 10
}
