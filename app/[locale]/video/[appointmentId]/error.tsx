"use client"

export default function VideoError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <h2 className="text-lg font-semibold text-red-900">Video call error</h2>
      <p className="mt-2 text-sm text-red-800">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
      >
        Try again
      </button>
    </div>
  )
}
