import { http, HttpResponse } from 'msw'

import type { Account } from '../../account/contracts'
import { getAccountRecord, updateAccountRecord } from './account-store'
import { API_BASE, getAuthenticatedUserId, requireAuth, validationError } from './helpers'

export const accountHandlers = [
  http.get(`${API_BASE}/account`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json(getAccountRecord(getAuthenticatedUserId(request)))
  }),

  http.patch(`${API_BASE}/account`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const patch = (await request.json()) as Partial<Pick<Account, 'name' | 'title' | 'language'>>
    const account = getAccountRecord(getAuthenticatedUserId(request))
    return HttpResponse.json(updateAccountRecord(account.id, patch))
  }),

  http.patch(`${API_BASE}/account/password`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const body = (await request.json()) as { currentPassword?: string; newPassword?: string }
    if (!body.currentPassword || !body.newPassword) {
      return validationError('Le mot de passe actuel et le nouveau mot de passe sont obligatoires.')
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(`${API_BASE}/account/preferences`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const patch = (await request.json()) as Pick<Account, 'twoFactorEnabled' | 'notificationsEnabled'>
    const account = getAccountRecord(getAuthenticatedUserId(request))
    return HttpResponse.json(updateAccountRecord(account.id, patch))
  }),

  http.post(`${API_BASE}/account/avatar`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const account = getAccountRecord(getAuthenticatedUserId(request))
    return HttpResponse.json({ avatarUrl: `/mock-assets/avatars/${account.id}-updated.png` })
  }),
]
