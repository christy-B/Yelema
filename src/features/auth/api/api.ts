import { apiRequest, setAuthToken } from '../../../shared/api/client/http-client'
import type {
  ActivationLookupResponse,
  LoginRequest,
  Session,
  TokenResponse,
} from './contracts'
import { toSession, type MeResponse } from './session-adapter'

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const response = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  setAuthToken(response.token)
  return response
}

export async function logout(): Promise<void> {
  // Révocation côté serveur en meilleur effort : si le jeton est déjà
  // expiré/révoqué, la purge locale suffit.
  await apiRequest<void>('/auth/logout', { method: 'POST' }).catch(() => undefined)
  setAuthToken(null)
}

export async function getSession(): Promise<Session> {
  const me = await apiRequest<MeResponse>('/auth/me')
  // La fonction affichée (jobTitle) n'est pas dans /auth/me : on la lit sur
  // /account, sans bloquer la session si l'appel échoue.
  const jobTitle = await apiRequest<{ jobTitle?: string | null }>('/account')
    .then((account) => account.jobTitle ?? '')
    .catch(() => '')
  return toSession(me, jobTitle)
}

export function requestPasswordReset(email: string): Promise<{ sent: true }> {
  return apiRequest('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, password: string): Promise<void> {
  return apiRequest('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function getActivation(token: string): Promise<ActivationLookupResponse> {
  return apiRequest(`/auth/activation?token=${encodeURIComponent(token)}`)
}

export async function activateAccount(token: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/activate', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}
