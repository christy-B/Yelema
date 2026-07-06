import { apiRequest, setAuthToken } from '../client/http-client'
import type {
  ActivationLookupResponse,
  LoginRequest,
  Session,
  TokenResponse,
} from './contracts'

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const response = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  setAuthToken(response.token)
  return response
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' })
  setAuthToken(null)
}

export function getSession(): Promise<Session> {
  return apiRequest<Session>('/auth/me')
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
