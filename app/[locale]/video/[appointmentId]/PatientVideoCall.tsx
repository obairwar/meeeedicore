"use client"

import { useRouter } from "@/i18n/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react"
import type { MediaConnection } from "peerjs"

import { Button } from "@/components/ui/button"
import { useSocket } from "@/components/shared/SocketProvider"
import { unwrapApi } from "@/lib/fetch-api"

type PeerConfig = { host: string; port: number; path: string; secure: boolean }

export function PatientVideoCall({
  appointmentId,
  userName,
}: {
  appointmentId: string
  userName: string
}) {
  const router = useRouter()
  const { socket } = useSocket()

  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<import("peerjs").default | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const activeCallRef = useRef<MediaConnection | null>(null)

  const [status, setStatus] = useState<"connecting" | "connected" | "ended" | "error" | "permission_denied">(
    "connecting"
  )
  const [statusMessage, setStatusMessage] = useState("Preparing camera…")
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)

  const endCall = useCallback(() => {
    setStatus("ended")
    socket?.emit("video:ended", { appointmentId })
    activeCallRef.current?.close()
    peerRef.current?.destroy()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    router.replace(`/feedback/${appointmentId}`)
  }, [appointmentId, router, socket])

  useEffect(() => {
    let destroyed = false
    let peerInstance: import("peerjs").default | null = null

    async function run() {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch (e) {
        console.error(e)
        setStatus("permission_denied")
        setStatusMessage(
          "Camera or microphone access was denied. Allow access in your browser settings for this site, then reload."
        )
        return
      }
      if (destroyed) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const res = await fetch(`/api/video/${appointmentId}/token`, { cache: "no-store" })
      const parsed = await unwrapApi<{ peerId: string; peerConfig: PeerConfig }>(res)
      if (!parsed.ok) {
        setStatus("error")
        setStatusMessage(parsed.error)
        return
      }
      const { peerId, peerConfig } = parsed.data
      const cfg = peerConfig

      const { default: Peer } = await import("peerjs")
      peerInstance = new Peer(peerId, {
        host: cfg.host,
        port: cfg.port,
        path: cfg.path,
        secure: cfg.secure,
      })
      peerRef.current = peerInstance

      peerInstance.on("open", () => {
        if (destroyed) return
        setStatusMessage("Waiting for doctor to connect…")
        socket?.emit("video:join", { appointmentId, peerId, role: "PATIENT" })
      })

      peerInstance.on("error", (err) => {
        console.error("[PeerJS]", err)
        setStatus("error")
        setStatusMessage(err.message || "Peer connection error")
      })

      peerInstance.on("disconnected", () => {
        setStatusMessage("Disconnected — you can leave or wait for reconnect")
      })

      peerInstance.on("call", (call) => {
        activeCallRef.current = call
        setStatus("connected")
        setStatusMessage("Connected")
        call.answer(stream)
        call.on("stream", (remote) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote
        })
        call.on("close", () => {
          activeCallRef.current = null
          setStatus("ended")
        })
        call.on("error", (err) => console.error("[PeerJS call]", err))
      })
    }

    void run()

    return () => {
      destroyed = true
      activeCallRef.current?.close()
      peerInstance?.destroy()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [appointmentId, socket])

  useEffect(() => {
    const s = localStreamRef.current
    if (!s) return
    s.getAudioTracks().forEach((t) => {
      t.enabled = !muted
    })
  }, [muted])

  useEffect(() => {
    const s = localStreamRef.current
    if (!s) return
    s.getVideoTracks().forEach((t) => {
      t.enabled = !camOff
    })
  }, [camOff])

  useEffect(() => {
    if (!socket) return
    const onEnded = ({ appointmentId: id }: { appointmentId: string }) => {
      if (id === appointmentId) endCall()
    }
    socket.on("video:ended", onEnded)
    return () => {
      socket.off("video:ended", onEnded)
    }
  }, [appointmentId, endCall, socket])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 min-h-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full object-contain bg-slate-900"
        />
        <div className="absolute top-4 left-4 rounded-md bg-black/60 px-3 py-1 text-sm text-white max-w-[90vw]">
          {status === "permission_denied" || status === "error" ? (
            <span className="text-amber-200">{statusMessage}</span>
          ) : status === "connecting" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" /> {statusMessage}
            </span>
          ) : status === "connected" ? (
            <span>Connected · {userName}</span>
          ) : status === "ended" ? (
            <span>Call ended</span>
          ) : (
            <span>{statusMessage}</span>
          )}
        </div>

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-24 right-4 h-36 w-52 rounded-lg border-2 border-white/30 object-cover shadow-lg md:h-44 md:w-64"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-800 bg-slate-950 px-4 py-3">
        <Button
          type="button"
          variant={muted ? "destructive" : "secondary"}
          size="icon"
          onClick={() => setMuted((m) => !m)}
          disabled={status === "permission_denied"}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button
          type="button"
          variant={camOff ? "destructive" : "secondary"}
          size="icon"
          onClick={() => setCamOff((c) => !c)}
          disabled={status === "permission_denied"}
          aria-label={camOff ? "Camera on" : "Camera off"}
        >
          {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
        <Button type="button" variant="destructive" className="gap-2 px-4" onClick={() => endCall()}>
          <PhoneOff className="h-5 w-5" />
          End call
        </Button>
      </div>
    </div>
  )
}
