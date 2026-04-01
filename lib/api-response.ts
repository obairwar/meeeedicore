import { NextResponse } from "next/server"

export type ApiSuccess<T> = { success: true; data: T; error: null }
export type ApiFailure = { success: false; data: null; error: string }

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>>
export function apiOk<T>(data: T, status?: number): NextResponse<ApiSuccess<T>>
export function apiOk<T>(data: T, init?: number | ResponseInit): NextResponse<ApiSuccess<T>> {
  const responseInit: ResponseInit | undefined =
    typeof init === "number" ? { status: init } : init
  return NextResponse.json({ success: true, data, error: null } satisfies ApiSuccess<T>, responseInit)
}

export function apiErr(error: string, status = 400): NextResponse<ApiFailure> {
  return NextResponse.json({ success: false, data: null, error } satisfies ApiFailure, { status })
}

export function apiUnauthorized(message = "Unauthorized"): NextResponse<ApiFailure> {
  return apiErr(message, 401)
}

export function apiForbidden(message = "Forbidden"): NextResponse<ApiFailure> {
  return apiErr(message, 403)
}

export function apiNotFound(message = "Not found"): NextResponse<ApiFailure> {
  return apiErr(message, 404)
}
