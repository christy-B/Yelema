import { HttpResponse } from 'msw'

import authFixture from '../fixtures/auth.json'

export const API_BASE = '/api/v1'

export function getAuthenticatedUserId(request: Request): string | undefined {
  const authorization = request.headers.get('Authorization')
  const account = authFixture.accounts.find(({ token }) => authorization === `Bearer ${token}`)
  return account?.userId
}

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
