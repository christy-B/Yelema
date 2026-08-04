import { HttpResponse } from 'msw'

import { USERS } from './demo-store'

export const API_BASE = '/api/v1'

/**
 * Version AUTONOME de ce module : ici TOUTE l'API est simulée, il n'y a pas de
 * control-plane derrière. Le porteur du jeton est donc résolu localement, à
 * partir du jeu de données d'authentification.
 *
 * C'est aussi ce qui évite une récursion : dans le monorepo, ce helper
 * interrogeait `/auth/me` pour valider un jeton. Ici `/auth/me` est lui-même
 * simulé, et l'interroger depuis le helper qui protège `/auth/me` bouclerait
 * indéfiniment.
 */
interface AuthenticatedUser {
  id: string
  email: string
}

function accountFromToken(request: Request): { userId: string; email: string } | undefined {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return undefined
  const token = authorization.slice('Bearer '.length).trim()
  const match = USERS.find((user) => user.token === token && user.status === 'active')
  return match ? { userId: match.id, email: match.email } : undefined
}

/** Identifiant du porteur du jeton. Utilisé par les domaines compte et membres. */
export function getAuthenticatedUserId(request: Request): string | undefined {
  return accountFromToken(request)?.userId
}

/**
 * Porteur du jeton, sous la forme attendue par les handlers venus du monorepo
 * (conversations, artefacts, routines) qui attribuent les enregistrements créés.
 * Asynchrone pour rester compatible avec leurs appels `await`.
 */
export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | undefined> {
  const account = accountFromToken(request)
  return account ? { id: account.userId, email: account.email } : undefined
}

/**
 * Garde d'authentification. Synchrone : un `await` devant un appel non
 * asynchrone est sans effet, la fonction sert donc les deux familles de
 * handlers sans qu'aucune n'ait à être adaptée.
 */
export function requireAuth(request: Request): Response | undefined {
  if (getAuthenticatedUserId(request)) {
    return undefined
  }

  return HttpResponse.json(
    { code: 'unauthorized', message: 'Une authentification est requise.' },
    { status: 401 },
  )
}

export function serverError(message: string): Response {
  return HttpResponse.json({ code: 'internal_error', message }, { status: 500 })
}

export function notFound(message: string): Response {
  return HttpResponse.json({ code: 'not_found', message }, { status: 404 })
}

export function forbidden(message: string): Response {
  return HttpResponse.json({ code: 'forbidden', message }, { status: 403 })
}

export function validationError(message: string): Response {
  return HttpResponse.json({ code: 'validation_error', message }, { status: 422 })
}
