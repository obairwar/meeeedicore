import { io as clientIO, type Socket } from "socket.io-client"

let socket: Socket | null = null

function getSocketUrl() {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_URL
  if (configured?.trim()) return configured.trim()
  // In production we require explicit configuration to avoid accidentally emitting to localhost.
  if (process.env.NODE_ENV === "production") return ""
  // Dev fallback (local socket server)
  return "http://127.0.0.1:3001"
}

export async function emitToRoom(room: string, event: string, payload: unknown) {
  const url = getSocketUrl()
  if (!url) return
  if (!socket) {
    socket = clientIO(url, {
      transports: ["websocket"],
      reconnection: true,
      autoConnect: true,
    })
  }

  // Wait briefly for connection (best-effort)
  if (!socket.connected) {
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 300)
      socket!.once("connect", () => {
        clearTimeout(t)
        resolve()
      })
    })
  }

  // Send to server: server will broadcast to room listeners
  socket.emit("server:emit", { room, event, payload })
}

