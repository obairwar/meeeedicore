"use client"

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { useSession } from "next-auth/react"

type SocketContextValue = {
  socket: Socket | null
  connected: boolean
  /** True when NEXT_PUBLIC_SOCKET_URL is set (client will try to connect). */
  socketEnabled: boolean
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  socketEnabled: false,
})

/**
 * Real-time Socket.io client. Only connects when `NEXT_PUBLIC_SOCKET_URL` is set
 * (e.g. `https://socket.example.com`). Do not point this at the Next.js app URL.
 * Run `npx tsx server/index.ts` when you need live queue / notifications.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const socketRef = useRef<Socket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  const url = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() ?? ""
  const socketEnabled = url.length > 0

  useEffect(() => {
    if (!socketEnabled) {
      return
    }

    const s = io(url, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
    })
    socketRef.current = s
    setSocket(s)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onConnectError = () => setConnected(false)

    s.on("connect", onConnect)
    s.on("disconnect", onDisconnect)
    s.on("connect_error", onConnectError)

    return () => {
      s.off("connect", onConnect)
      s.off("disconnect", onDisconnect)
      s.off("connect_error", onConnectError)
      s.removeAllListeners()
      s.close()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }
  }, [socketEnabled, url])

  const staffRoles = useMemo(
    () => ["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "PHARMACIST", "LAB_TECHNICIAN"] as const,
    []
  )

  const role = session?.user?.role

  useEffect(() => {
    const s = socketRef.current
    if (!s || !userId || !socketEnabled) return
    if (!s.connected) return
    s.emit("join", { room: userId })
    if (role && staffRoles.includes(role as (typeof staffRoles)[number])) {
      s.emit("join", { room: "staff-emergency" })
    }
  }, [userId, connected, role, staffRoles, socketEnabled])

  const value = useMemo(
    () => ({ socket: socketEnabled ? socket : null, connected: socketEnabled && connected, socketEnabled }),
    [socket, connected, socketEnabled]
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  return useContext(SocketContext)
}
