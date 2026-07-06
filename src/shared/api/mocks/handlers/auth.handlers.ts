import { delay, http, HttpResponse } from 'msw'

import authFixture from '../fixtures/auth.json'
import sessionFixture from '../fixtures/session.json'
import newSessionFixture from '../fixtures/session-new.json'
import emptySessionFixture from '../fixtures/session-empty.json'
import bakarySessionFixture from '../fixtures/session-bakary.json'
import { getAccountRecord } from './account-store'
import { API_BASE, requireAuth, serverError, validationError } from './helpers'

const sessionsByUser: Record<string, unknown> = {
  u_99: newSessionFixture,
  u_20: emptySessionFixture,
  u_18: bakarySessionFixture,
}

interface CredentialsBody {
  email?: string
  password?: string
}

interface TokenPasswordBody {
  token?: string
  password?: string
}

interface MockAccount {
  userId: string
  email: string
  password: string | null
  token: string
  status: 'active' | 'pending'
}

const accounts = structuredClone(authFixture.accounts) as MockAccount[]

function accountFromRequest(request: Request): MockAccount | undefined {
  const authorization = request.headers.get('Authorization')
  return accounts.find(({ token }) => authorization === `Bearer ${token}`)
}

export const authHandlers = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as CredentialsBody
    await delay(450)

    if (!body.email || !body.password) {
      return validationError('L’adresse e-mail et le mot de passe sont obligatoires.')
    }

    if (
      body.email === authFixture.serverErrorCredentials.email
      && body.password === authFixture.serverErrorCredentials.password
    ) {
      return serverError('Le service est temporairement indisponible. Réessayez dans quelques instants.')
    }

    const account = accounts.find(({ email }) => email === body.email)
    if (!account || account.status !== 'active' || account.password !== body.password) {
      return HttpResponse.json(
        { code: 'invalid_credentials', message: 'Adresse e-mail ou mot de passe incorrect.' },
        { status: 401 },
      )
    }

    return HttpResponse.json({
      token: account.token,
      expiresAt: authFixture.expiresAt,
    })
  }),

  http.post(`${API_BASE}/auth/logout`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API_BASE}/auth/password/forgot`, async ({ request }) => {
    const body = (await request.json()) as { email?: string }
    if (!body.email) {
      return validationError('L’adresse e-mail est obligatoire.')
    }
    return HttpResponse.json({ sent: true })
  }),

  http.post(`${API_BASE}/auth/password/reset`, async ({ request }) => {
    const body = (await request.json()) as TokenPasswordBody
    if (!body.token || !body.password) {
      return validationError('Le jeton et le nouveau mot de passe sont obligatoires.')
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/auth/activation`, ({ request }) => {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) {
      return validationError('Le jeton d’activation est obligatoire.')
    }
    if (token !== authFixture.activation.token) {
      return HttpResponse.json(
        { code: 'invalid_activation_token', message: 'Ce lien d’activation est invalide ou a expiré.' },
        { status: 404 },
      )
    }
    return HttpResponse.json({
      valid: authFixture.activation.valid,
      email: authFixture.activation.email,
      name: authFixture.activation.name,
    })
  }),

  http.post(`${API_BASE}/auth/activate`, async ({ request }) => {
    const body = (await request.json()) as TokenPasswordBody
    if (!body.token || !body.password) {
      return validationError('Le jeton et le mot de passe sont obligatoires.')
    }
    if (body.token !== authFixture.activation.token) {
      return HttpResponse.json(
        { code: 'invalid_activation_token', message: 'Ce lien d’activation est invalide ou a expiré.' },
        { status: 404 },
      )
    }
    if (body.password.length < 8) {
      return validationError('Le mot de passe doit contenir au moins 8 caractères.')
    }
    const account = accounts.find(({ userId }) => userId === authFixture.activation.userId)
    if (!account) return serverError('Le compte associé à cette invitation est introuvable.')
    account.password = body.password
    account.status = 'active'
    return HttpResponse.json({
      token: account.token,
      expiresAt: authFixture.expiresAt,
    })
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const account = accountFromRequest(request)
    const base = (sessionsByUser[account?.userId ?? ''] ?? sessionFixture) as { user: object; workspace: object; capabilities: string[] }
    // Le profil (nom, fonction, e-mail, avatar) vient du store compte — source
    // unique, pour que la sidebar reflète les modifications faites dans Compte.
    const profile = getAccountRecord(account?.userId)
    return HttpResponse.json({
      ...base,
      user: { id: profile.id, name: profile.name, title: profile.title, email: profile.email, language: profile.language, avatarUrl: profile.avatarUrl },
    })
  }),
]
