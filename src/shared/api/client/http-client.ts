const API_BASE_URL = import.meta.env.VITE_API_BASE ?? '/api/v1'
const AUTH_TOKEN_KEY = 'yelema.auth.token'

export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.details = body.details
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    return
  }

  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers = new Headers(init.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const fallback: ApiErrorBody = {
      code: 'http_error',
      message: response.statusText || 'Une erreur est survenue.',
    }
    const body = (await response.json().catch(() => fallback)) as ApiErrorBody
    throw new ApiError(response.status, body)
  }

  return response
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init)

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
