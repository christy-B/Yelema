import { delay, http, HttpResponse } from 'msw'

import { ACTIVATION, roleByKey, USERS, WORKSPACE } from './demo-store'
import { API_BASE, getAuthenticatedUserId, requireAuth, validationError } from './helpers'

/**
 * Authentification simulée, aux formes de GET /auth/me de l'API v1 : utilisateur,
 * espace de travail, rôle avec sa matrice de permissions. C'est cette matrice que
 * l'interface interroge pour afficher ou masquer chaque écran.
 */

const EXPIRES_AT = '2027-01-01T00:00:00.000Z'

export const authHandlers = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    // Latence volontaire : le bouton doit avoir le temps de montrer son état.
    await delay(420)

    if (!body.email || !body.password) {
      return validationError('L’adresse e-mail et le mot de passe sont obligatoires.')
    }

    const user = USERS.find((candidate) => candidate.email === body.email)
    if (!user || user.status !== 'active' || user.password !== body.password) {
      return HttpResponse.json(
        { code: 'invalid_credentials', message: 'Adresse e-mail ou mot de passe incorrect.' },
        { status: 401 },
      )
    }

    return HttpResponse.json({ token: user.token, expiresAt: EXPIRES_AT })
  }),

  http.post(`${API_BASE}/auth/logout`, ({ request }) => {
    return requireAuth(request) ?? new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const user = USERS.find((candidate) => candidate.id === getAuthenticatedUserId(request))
    if (!user) return new HttpResponse(null, { status: 401 })
    const role = roleByKey(user.roleKey)

    return HttpResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        isFirstAdmin: user.isFirstAdmin,
        avatarUrl: user.avatarUrl,
      },
      workspace: {
        id: WORKSPACE.id,
        name: WORKSPACE.name,
        slug: WORKSPACE.slug,
        hosting: WORKSPACE.hosting,
        logoUrl: WORKSPACE.branding.logoUrl,
        plan: WORKSPACE.plan,
      },
      role: role ? { key: role.key, name: role.name, permissions: role.permissions } : null,
    })
  }),

  http.post(`${API_BASE}/auth/password/forgot`, async ({ request }) => {
    const body = (await request.json()) as { email?: string }
    if (!body.email) return validationError('L’adresse e-mail est obligatoire.')
    // Réponse identique que l'adresse existe ou non : on ne révèle pas les comptes.
    return HttpResponse.json({ sent: true })
  }),

  http.post(`${API_BASE}/auth/password/reset`, async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string }
    if (!body.token || !body.password) {
      return validationError('Le jeton et le nouveau mot de passe sont obligatoires.')
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/auth/activation`, ({ request }) => {
    const token = new URL(request.url).searchParams.get('token')
    if (token !== ACTIVATION.token) {
      return HttpResponse.json({ valid: false, email: '', name: '' })
    }
    return HttpResponse.json({ valid: true, email: ACTIVATION.email, name: ACTIVATION.name })
  }),

  http.post(`${API_BASE}/auth/activate`, async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string }
    if (!body.token || !body.password) {
      return validationError('Le jeton et le mot de passe sont obligatoires.')
    }
    if (body.token !== ACTIVATION.token) {
      return validationError('Ce lien d’activation n’est plus valable.')
    }
    // L'activation connecte directement : on rend le jeton du compte de démonstration.
    return HttpResponse.json({ token: USERS[0].token, expiresAt: EXPIRES_AT })
  }),
]
