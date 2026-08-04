const API_BASE_URL = import.meta.env.VITE_API_BASE ?? '/api/v1'
const AUTH_TOKEN_KEY = 'yelema.auth.token'
export const SESSION_EXPIRED_KEY = 'yelema.session-expired'

// Doit rester égal à paths.login (on ne peut pas importer core/ depuis shared/).
const LOGIN_URL = '/espace-client/login'

/**
 * Endpoints d'auth dont le 401 est « normal » (identifiants invalides, token
 * de lien expiré…) : ils ne signalent pas une session expirée.
 */
const AUTH_FLOW_PATHS = ['/auth/login', '/auth/logout', '/auth/activate', '/auth/activation', '/auth/verify', '/auth/password/forgot', '/auth/password/reset']

/**
 * L'API v1 n'a pas de refresh token : un 401 avec un jeton en poche signifie
 * que la session a expiré (ou a été révoquée). On purge et on renvoie au
 * login, en mémorisant la page en cours pour y revenir après reconnexion.
 */
function handleExpiredSession(path: string): void {
  if (AUTH_FLOW_PATHS.some((authPath) => path.startsWith(authPath))) return
  if (!getAuthToken()) return
  setAuthToken(null)
  sessionStorage.setItem(SESSION_EXPIRED_KEY, window.location.pathname)
  window.location.assign(LOGIN_URL)
}

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
    if (response.status === 401) {
      handleExpiredSession(path)
    }
    const fallback: ApiErrorBody = {
      code: 'http_error',
      message: response.statusText || 'Une erreur est survenue.',
    }
    const raw = (await response.json().catch(() => fallback)) as ApiErrorBody & { error?: ApiErrorBody }
    // L'API réelle enveloppe l'erreur ({ error: { code, message, status } }),
    // les mocks restants renvoient la forme plate — on accepte les deux.
    const body = raw.error ?? raw
    throw new ApiError(response.status, {
      code: body.code ?? fallback.code,
      message: body.message ?? fallback.message,
      details: body.details,
    })
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
