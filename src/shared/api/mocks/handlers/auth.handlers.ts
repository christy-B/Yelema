import { delay, http, HttpResponse } from 'msw'

import { ACTIVATION, MEMBERS, pendingByActivationToken, persistProvisioned, roleByKey, USERS, WORKSPACE } from './demo-store'
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

    /**
     * COPIE DE DEMONSTRATION : la connexion n'oppose aucun refus. On entre en
     * cliquant, que les identifiants soient justes ou non — il n'y a rien a
     * proteger ici, et une porte fermee n'empecherait que de montrer le produit.
     *
     * L'adresse saisie sert quand meme a choisir la personne : la taper permet
     * d'entrer en tant qu'elle. Inconnue ou vide, on entre en tant que premier
     * compte actif.
     */
    const asked = USERS.find((candidate) => candidate.email === body.email)
    const user = asked ?? USERS.find((candidate) => candidate.status === 'active') ?? USERS[0]
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
    const token = new URL(request.url).searchParams.get('token') ?? ''
    // Comptes créés depuis la console : chacun a son jeton. Le jeton historique
    // de la démonstration reste accepté.
    const pending = pendingByActivationToken(token)
    if (pending) return HttpResponse.json({ valid: true, email: pending.email, name: pending.name })
    if (token !== ACTIVATION.token) return HttpResponse.json({ valid: false, email: '', name: '' })
    return HttpResponse.json({ valid: true, email: ACTIVATION.email, name: ACTIVATION.name })
  }),

  http.post(`${API_BASE}/auth/activate`, async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string }
    if (!body.token || !body.password) {
      return validationError('Le jeton et le mot de passe sont obligatoires.')
    }

    const pending = pendingByActivationToken(body.token)
    if (pending) {
      // Le compte devient utilisable : mot de passe posé, jeton d'activation
      // consommé — un lien d'activation ne sert qu'une fois.
      pending.password = body.password
      pending.status = 'active'
      pending.activationToken = null
      const member = MEMBERS.find((item) => item.id === pending.id)
      if (member) member.status = 'active'
      persistProvisioned()
      return HttpResponse.json({ token: pending.token, expiresAt: EXPIRES_AT })
    }

    if (body.token !== ACTIVATION.token) {
      return validationError('Ce lien d’activation n’est plus valable.')
    }
    // L'activation connecte directement : on rend le jeton du compte de démonstration.
    return HttpResponse.json({ token: USERS[0].token, expiresAt: EXPIRES_AT })
  }),
]
