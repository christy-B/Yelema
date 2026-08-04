import { http, HttpResponse } from 'msw'

import { WORKSPACE } from './demo-store'
import { API_BASE, requireAuth, validationError } from './helpers'

/**
 * Espace de travail, aux formes de GET/PATCH /workspace de l'API v1. Seules la
 * charte graphique et les notifications sont modifiables par le client : le cœur
 * du dossier (nom légal, hébergement, plan) est géré par Yelema.
 */
export const workspaceHandlers = [
  http.get(`${API_BASE}/workspace`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(WORKSPACE)
  }),

  http.patch(`${API_BASE}/workspace`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const body = (await request.json()) as {
      branding?: Partial<typeof WORKSPACE.branding>
      notifications?: Partial<typeof WORKSPACE.notifications>
    }

    if (body.branding) {
      for (const [key, value] of Object.entries(body.branding)) {
        if (value === null || typeof value === 'string') {
          (WORKSPACE.branding as Record<string, string | null>)[key] = value
        }
      }
    }
    if (body.notifications) {
      const { digestFrequency, alertEmail, channels } = body.notifications
      if (digestFrequency === null || typeof digestFrequency === 'string') {
        WORKSPACE.notifications.digestFrequency = digestFrequency
      }
      if (alertEmail === null || typeof alertEmail === 'string') {
        WORKSPACE.notifications.alertEmail = alertEmail
      }
      if (Array.isArray(channels)) WORKSPACE.notifications.channels = channels
    }

    return HttpResponse.json(WORKSPACE)
  }),

  http.post(`${API_BASE}/workspace/logo`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return validationError('Une image est obligatoire.')
    // Sans stockage, l'URL ne vaut que pour l'onglet courant — assez pour l'aperçu.
    WORKSPACE.branding.logoUrl = URL.createObjectURL(file)
    return HttpResponse.json(WORKSPACE)
  }),
]
