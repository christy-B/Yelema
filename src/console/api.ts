/**
 * Accès aux routes de la console de démonstration (`/api/demo`).
 *
 * Volontairement séparé de `shared/api` : ce n'est pas l'API du produit, aucun
 * écran client ne doit l'appeler, et le jour où le control-plane provisionne
 * réellement les comptes, ce dossier entier disparaît.
 */
const DEMO_BASE = '/api/demo'

export interface ConsoleUser {
  id: string
  name: string
  email: string
  status: 'active' | 'pending'
  roleKey: string
  /** Présent tant que le compte n'est pas activé. */
  activationLink: string | null
}

export interface ConsoleOverview {
  workspace: { id: string; name: string; plan: { key: string; name: string } | null }
  plans: { key: string; name: string; seats: number }[]
  roles: { key: string; name: string }[]
  users: ConsoleUser[]
}

export interface DemoMessage {
  id: string
  kind: 'activation' | 'invitation' | 'reset'
  to: string
  toName: string
  subject: string
  body: string
  link: string
  sentAt: string
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DEMO_BASE}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(detail?.message ?? 'La console n’a pas pu traiter cette demande.')
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}

export const getOverview = () => call<ConsoleOverview>('/overview')

export const updateWorkspace = (payload: { name?: string; planKey?: string }) =>
  call<ConsoleOverview['workspace']>('/workspace', { method: 'PATCH', body: JSON.stringify(payload) })

export const createUser = (payload: { name: string; email: string; roleKey: string; jobTitle?: string }) =>
  call<ConsoleUser>('/users', { method: 'POST', body: JSON.stringify(payload) })

export const getMessages = () => call<DemoMessage[]>('/messages')

export const clearMessages = () => call<void>('/messages', { method: 'DELETE' })
