import { apiRequest } from '../../../shared/api/client/http-client'
import type { Account } from './contracts'

/** DTO RÉEL de GET/PATCH /account (control-plane, v1). */
interface RealAccount {
  id: string
  name: string
  email: string
  jobTitle?: string | null
  avatarUrl?: string | null
  preferences?: {
    twofa?: boolean
    mailDigest?: boolean
    usageAlerts?: boolean
  } | null
}

function toAccount(real: RealAccount): Account {
  return {
    id: real.id,
    name: real.name,
    title: real.jobTitle ?? '',
    email: real.email,
    // La langue n'existe pas encore dans l'API v1 : interface en français.
    language: 'fr',
    avatarUrl: real.avatarUrl ?? undefined,
    twoFactorEnabled: real.preferences?.twofa ?? false,
    notificationsEnabled: real.preferences?.mailDigest ?? false,
  }
}

export async function getAccount(): Promise<Account> {
  return toAccount(await apiRequest<RealAccount>('/account'))
}

export async function updateAccount(payload: Partial<Pick<Account, 'name' | 'title' | 'language'>>): Promise<Account> {
  // PATCH /account n'accepte que `name` et `jobTitle` (allow-list stricte).
  const body: Record<string, string> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.title !== undefined) body.jobTitle = payload.title
  return toAccount(
    await apiRequest<RealAccount>('/account', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  )
}

export function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiRequest('/account/password', {
    method: 'PATCH',
    body: JSON.stringify({ current: currentPassword, next: newPassword }),
  })
}

export async function updatePreferences(payload: Pick<Account, 'twoFactorEnabled' | 'notificationsEnabled'>): Promise<Account> {
  // L'API répond {updated:true} : on relit le compte pour rendre l'état à jour.
  await apiRequest('/account/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ twofa: payload.twoFactorEnabled, mailDigest: payload.notificationsEnabled }),
  })
  return getAccount()
}

export function updateAvatar(file: File): Promise<{ avatarUrl: string }> {
  const body = new FormData()
  body.append('file', file)
  return apiRequest('/account/avatar', { method: 'POST', body })
}
