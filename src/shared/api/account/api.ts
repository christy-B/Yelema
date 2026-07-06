import { apiRequest } from '../client/http-client'
import type { Account } from './contracts'

export function getAccount(): Promise<Account> {
  return apiRequest('/account')
}

export function updateAccount(payload: Partial<Pick<Account, 'name' | 'title' | 'language'>>): Promise<Account> {
  return apiRequest('/account', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiRequest('/account/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function updatePreferences(payload: Pick<Account, 'twoFactorEnabled' | 'notificationsEnabled'>): Promise<Account> {
  return apiRequest('/account/preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateAvatar(file: File): Promise<{ avatarUrl: string }> {
  const body = new FormData()
  body.append('file', file)
  return apiRequest('/account/avatar', { method: 'POST', body })
}
