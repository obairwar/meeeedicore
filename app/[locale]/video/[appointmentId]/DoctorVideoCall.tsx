"use client"

import { Link, useRouter } from "@/i18n/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Stethoscope,
  Video,
  VideoOff,
} from "lucide-react"
import type { MediaConnection } from "peerjs"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useSocket } from "@/components/shared/SocketProvider"
import { cn } from "@/lib/utils"
import { unwrapApi } from "@/lib/fetch-api"

type PeerConfig = { host: string; port: number; path: string; secure: boolean }

type ChatMsg = {
  appointmentId: string
  message: string
  sender: string
  timestamp: string
}

export function DoctorVideoCall({
  appointmentId,
  userName,
  patientName,
  patientSymptoms,
  patientAgeLabel,
}: {
  appointmentId: string
  userName: string
  patientName: string
  patientSymptoms: string
  patientAgeLabel: string
}) {
  const router = useRouter()
  const { socket } = useSocket()

  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<import("peerjs").default | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const activeCallRef = useRef<MediaConnection | null>(null)

  const [peerId, setPeerId] = useState<string | null>(null)
  const [callPhase, setCallPhase] = useState<"connecting" | "connected" | "ended" | "error" | "permission_denied">(
    "connecting"
  )
  const [callHint, setCallHint] = useState("Starting camera…")
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [rxOpen, setRxOpen] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [rxNotes, setRxNotes] = useState("")

  const patientPeerId = `patient-${appointmentId}`

  const sendChat = useCallback(() => {
    const text = chatInput.trim()
    if (!text || !socket) return
    const payload: ChatMsg = {
      appointmentId,
      message: text,
      sender: userName,
      timestamp: new Date().toISOString(),
    }
    socket.emit("video:chat_message", payload)
    setChatInput("")
  }, [appointmentId, chatInput, socket, userName])

  useEffect(() => {
    if (!socket) return
    const onChat = (p: ChatMsg) => {
      if (p.appointmentId === appointmentId) setMessages((m) => [...m, p])
    }
    const onEnded = ({ appointmentId: id }: { appointmentId: string }) => {
      if (id === appointmentId) {
        setCallPhase("ended")
        router.replace("/doctor/dashboard")
      }
    }
    socket.on("video:chat_message", onChat)
    socket.on("video:ended", onEnded)
    return () => {
      socket.off("video:chat_message", onChat)
      socket.off("video:ended", onEnded)
    }
  }, [appointmentId, router, socket])

  useEffect(() => {
    let destroyed = false
    let peerInstance: import("peerjs").default | null = null

    function dialPatient(p: import("peerjs").default, stream: MediaStream) {
      setCallHint("Connecting…")
      const call = p.call(patientPeerId, stream)
      activeCallRef.current = call
      call.on("stream", (remote) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote
        setCallPhase("connected")
        setCallHint("Connected")
      })
      call.on("close", () => {
        activeCallRef.current = null
        setCallPhase("ended")
        setCallHint("Call ended")
      })
      call.on("error", (e) => console.error("[PeerJS call]", e))
    }

    async function run() {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch (e) {
        console.error(e)
        setCallPhase("permission_denied")
        setCallHint("Allow camera and microphone in browser settings, then reload.")
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
        setCallPhase("error")
        setCallHint(parsed.error)
        return
      }
      const { peerId: myId, peerConfig } = parsed.data
      const cfg = peerConfig

      const { default: Peer } = await import("peerjs")
      peerInstance = new Peer(myId, {
        host: cfg.host,
        port: cfg.port,
        path: cfg.path,
        secure: cfg.secure,
      })
      peerRef.current = peerInstance

      peerInstance.on("open", (id) => {
        setPeerId(id)
        socket?.emit("video:join", { appointmentId, peerId: id, role: "DOCTOR" })
        dialPatient(peerInstance!, stream)
      })

      peerInstance.on("error", (err) => {
        console.error("[PeerJS]", err)
        setCallPhase("error")
        setCallHint(err.message || "Peer error")
      })
    }

    void run()

    return () => {
      destroyed = true
      activeCallRef.current?.close()
      peerInstance?.destroy()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [appointmentId, patientPeerId, socket])

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

  function endCall() {
    socket?.emit("video:ended", { appointmentId })
    activeCallRef.current?.close()
    peerRef.current?.destroy()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    setCallPhase("ended")
    router.replace("/doctor/dashboard")
  }

  async function toggleScreenShare() {
    const call = activeCallRef.current
    const pc = call?.peerConnection
    if (!pc) return
    try {
      if (!screenSharing) {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const v = display.getVideoTracks()[0]
        const sender = pc.getSenders().find((s) => s.track?.kind === "video")
        await sender?.replaceTrack(v)
        v.onended = () => {
          void toggleScreenShare()
        }
        setScreenSharing(true)
      } else {
        const cam = localStreamRef.current?.getVideoTracks()[0]
        const sender = pc.getSenders().find((s) => s.track?.kind === "video")
        if (cam) await sender?.replaceTrack(cam)
        setScreenSharing(false)
      }
    } catch {
      /* user cancelled */
    }
  }

  const banner =
    callPhase === "permission_denied" || callPhase === "error"
      ? callHint
      : callPhase === "connecting"
        ? callHint
        : callPhase === "connected"
          ? "Connected"
          : callPhase === "ended"
            ? "Call ended"
            : callHint

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-contain bg-slate-900"
          />
          <div className="absolute top-4 left-4 rounded-md bg-black/60 px-3 py-1 text-sm text-white">
            {callPhase === "connecting" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {banner}
              </span>
            ) : (
              <span>{banner}</span>
            )}
            {peerId ? <span className="ml-2 text-slate-300 text-xs">· {peerId}</span> : null}
          </div>

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 h-36 w-52 rounded-lg border-2 border-white/30 object-cover shadow-lg md:h-44 md:w-64"
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 gap-2"
            onClick={() => setRxOpen(true)}
          >
            <Stethoscope className="h-4 w-4" />
            Patient & notes
          </Button>
          <Sheet open={rxOpen} onOpenChange={setRxOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md bg-slate-50 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Patient</SheetTitle>
                <SheetDescription>Quick notes during the video visit.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="font-semibold text-slate-900">{patientName}</div>
                  <div className="text-slate-600">Age: {patientAgeLabel}</div>
                  <div className="text-slate-700 mt-2">
                    <span className="font-medium">Symptoms: </span>
                    {patientSymptoms}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-slate-800">Prescription / consultation notes</div>
                  <textarea
                    value={rxNotes}
                    onChange={(e) => setRxNotes(e.target.value)}
                    placeholder="Draft notes (not auto-saved to EMR)"
                    rows={6}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-y"
                  />
                </div>
                <Link
                  href="/doctor/dashboard"
                  className={cn(buttonVariants({ variant: "outline" }), "w-full inline-flex justify-center")}
                >
                  Back to queue
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {chatOpen ? (
        <div className="absolute bottom-20 right-4 z-10 flex w-80 flex-col rounded-lg border border-slate-700 bg-slate-900/95 shadow-xl">
          <div className="border-b border-slate-700 px-3 py-2 text-sm font-medium text-white">In-call chat</div>
          <ScrollArea className="h-48 px-2 py-2">
            <div className="space-y-2">
              {messages.map((m, i) => (
                <div key={`${m.timestamp}-${i}`} className="text-xs text-slate-200">
                  <span className="font-medium text-sky-300">{m.sender}:</span> {m.message}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-1 border-t border-slate-700 p-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message…"
              className="bg-slate-800 text-white border-slate-600"
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
            />
            <Button type="button" size="sm" onClick={() => void sendChat()}>
              Send
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-800 bg-slate-950 px-4 py-3">
        <Button
          type="button"
          variant={muted ? "destructive" : "secondary"}
          size="icon"
          onClick={() => setMuted((m) => !m)}
          disabled={callPhase === "permission_denied"}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button
          type="button"
          variant={camOff ? "destructive" : "secondary"}
          size="icon"
          onClick={() => setCamOff((c) => !c)}
          disabled={callPhase === "permission_denied"}
          aria-label={camOff ? "Camera on" : "Camera off"}
        >
          {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
        <Button type="button" variant="secondary" size="icon" onClick={() => void toggleScreenShare()} aria-label="Share screen">
          <MonitorUp className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant={chatOpen ? "default" : "secondary"}
          size="icon"
          onClick={() => setChatOpen((c) => !c)}
          aria-label="Toggle chat"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button type="button" variant="destructive" className="gap-2 px-4" onClick={() => endCall()}>
          <PhoneOff className="h-5 w-5" />
          End call
        </Button>
      </div>
    </div>
  )
}
