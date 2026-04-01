export const QUEUE_SNAPSHOT_KEY = "hms-queue-cache"

export type QueueSnapshot = {
  appointmentId: string
  tokenCode: string
  position: number
  totalInQueue: number
  queueStatus: string
  updatedAt: number
}

export function saveQueueSnapshot(status: {
  appointmentId: string
  tokenCode: string
  position: number
  totalInQueue: number
  queueStatus: string
}) {
  if (typeof window === "undefined") return
  try {
    const snap: QueueSnapshot = {
      ...status,
      updatedAt: Date.now(),
    }
    localStorage.setItem(QUEUE_SNAPSHOT_KEY, JSON.stringify(snap))
  } catch {
    /* storage full / private mode */
  }
}

export function readQueueSnapshot(): QueueSnapshot | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(QUEUE_SNAPSHOT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QueueSnapshot
  } catch {
    return null
  }
}
