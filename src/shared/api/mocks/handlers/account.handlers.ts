import { http, HttpResponse } from 'msw'

import { USERS } from './demo-store'
import { API_BASE, getAuthenticatedUserId, requireAuth, validationError } from './helpers'

/** Compte du membre connecté, aux formes de GET/PATCH /account de l'API v1. */

function currentUser(request: Request) {
  const id = getAuthenticatedUserId(request)
  return USERS.find((user) => user.id === id)
}

function toDto(user: NonNullable<ReturnType<typeof currentUser>>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
    preferences: user.preferences,
  }
}

export const accountHandlers = [
  http.get(`${API_BASE}/account`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const user = currentUser(request)
    return user ? HttpResponse.json(toDto(user)) : new HttpResponse(null, { status: 401 })
  }),

  // L'API réelle n'accepte que `name` et `jobTitle` : même liste blanche ici.
  http.patch(`${API_BASE}/account`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const user = currentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })

    const body = (await request.json()) as { name?: unknown; jobTitle?: unknown }
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) return validationError('Le nom est obligatoire.')
      user.name = name
    }
    if (typeof body.jobTitle === 'string') user.jobTitle = body.jobTitle.trim()

    return HttpResponse.json(toDto(user))
  }),

  http.patch(`${API_BASE}/account/password`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const user = currentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })

    const body = (await request.json()) as { currentPassword?: string; newPassword?: string }
    if (!body.currentPassword || !body.newPassword) {
      return validationError('Le mot de passe actuel et le nouveau sont obligatoires.')
    }
    if (body.currentPassword !== user.password) {
      return validationError('Le mot de passe actuel est incorrect.')
    }
    if (body.newPassword.length < 10) {
      return validationError('Le nouveau mot de passe doit faire au moins 10 caractères.')
    }
    user.password = body.newPassword
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(`${API_BASE}/account/preferences`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const user = currentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })

    const body = (await request.json()) as Partial<typeof user.preferences>
    for (const key of ['twofa', 'mailDigest', 'usageAlerts'] as const) {
      if (typeof body[key] === 'boolean') user.preferences[key] = body[key]
    }
    return HttpResponse.json(toDto(user))
  }),

  http.post(`${API_BASE}/account/avatar`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const user = currentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return validationError('Une image est obligatoire.')
    // Sans stockage, on rend une URL locale à l'onglet : suffisant pour l'aperçu.
    user.avatarUrl = URL.createObjectURL(file)
    return HttpResponse.json(toDto(user))
  }),
]
