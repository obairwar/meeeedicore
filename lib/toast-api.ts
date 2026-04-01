import { toast } from "sonner"

const SUCCESS_MS = 3000
const ERROR_MS = 5000

export function toastSuccess(message: string) {
  toast.success(message, { duration: SUCCESS_MS })
}

export function toastError(message: string) {
  toast.error(message, { duration: ERROR_MS })
}

export function toastLoading(message: string) {
  return toast.loading(message)
}

export function toastDismiss(id: string | number) {
  toast.dismiss(id)
}

/** Parse JSON error body from failed API response */
export async function toastErrorFromResponse(res: Response, fallback = "Something went wrong") {
  try {
    const j = (await res.json()) as { error?: string; message?: string }
    toastError(j.error ?? j.message ?? fallback)
  } catch {
    toastError(fallback)
  }
}
