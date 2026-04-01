import "dotenv/config"
import express from "express"
import http from "http"
import cors from "cors"
import { Server } from "socket.io"
import { PeerServer } from "peer"

const corsOrigins =
  process.env.NODE_ENV === "production" && process.env.SOCKET_CORS_ORIGIN
    ? process.env.SOCKET_CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
    : true

const app = express()
app.use(cors({ origin: corsOrigins, credentials: true }))

const server = http.createServer(app)
export const io = new Server(server, {
  cors: { origin: corsOrigins, credentials: true },
  transports: ["websocket", "polling"],
})

io.on("connection", (socket) => {
  socket.on("join", ({ room }: { room: string }) => {
    if (room) socket.join(room)
  })

  socket.on(
    "server:emit",
    ({ room, event, payload }: { room: string; event: string; payload: unknown }) => {
      if (!room || !event) return
      io.to(room).emit(event, payload)
    }
  )

  socket.on(
    "video:join",
    ({ appointmentId, peerId, role }: { appointmentId?: string; peerId?: string; role?: string }) => {
      if (!appointmentId || !peerId) return
      const room = `video-${appointmentId}`
      socket.join(room)
      socket.to(room).emit("video:peer_joined", { peerId, role })
    }
  )

  socket.on("video:chat_message", (payload: { appointmentId?: string } & Record<string, unknown>) => {
    const id = payload?.appointmentId
    if (!id) return
    io.to(`video-${id}`).emit("video:chat_message", payload)
  })

  socket.on("video:ended", ({ appointmentId }: { appointmentId?: string }) => {
    if (!appointmentId) return
    io.to(`video-${appointmentId}`).emit("video:ended", { appointmentId })
  })

  socket.on("emergency:sos", (payload: Record<string, unknown>) => {
    io.to("staff-emergency").emit("emergency:alert", payload)
  })
})

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

const socketPort = Number(process.env.SOCKET_PORT ?? 3001)
server.listen(socketPort, () => {
  console.log(`[Socket] listening on port ${socketPort}`)
})

const peerCors =
  process.env.NODE_ENV === "production" && process.env.PEER_CORS_ORIGIN
    ? process.env.PEER_CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
    : true

export const peerServer = PeerServer({
  port: Number(process.env.PEER_PORT ?? 9000),
  path: process.env.PEER_PATH ?? "/peerjs",
  key: process.env.PEER_KEY ?? "peerjs",
  corsOptions:
    peerCors === true
      ? { origin: true, credentials: true }
      : { origin: peerCors, credentials: true },
})

console.log(
  `[PeerJS] listening on port ${Number(process.env.PEER_PORT ?? 9000)} path ${process.env.PEER_PATH ?? "/peerjs"}`
)
