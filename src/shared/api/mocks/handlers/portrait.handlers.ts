import { http, HttpResponse } from 'msw'

import { ROSTER } from '../../../../features/agents/roster'
import { API_BASE, notFound, requireAuth } from './helpers'

/**
 * GÉNÉRATION DE PORTRAIT — la demande crée un travail, l'exécution prend quelques
 * secondes, puis trois propositions sont rendues.
 *
 * Le contrat est ce qui compte ici : le back-office branchera un modèle d'image
 * conditionné par la photo de référence de l'expert et par les fragments de
 * consigne des quatre axes. Le mock respecte la même forme et le même délai, de
 * façon à ce que l'interface soit écrite contre le comportement réel — attente
 * comprise.
 */

/** Temps de production simulé, de l'ordre de ce qu'un modèle d'image demande. */
const GENERATION_MS = 2600

interface Job {
  id: string
  agentId: string
  createdAt: number
  crops: ('serre' | 'buste' | 'plein')[]
}

const jobs = new Map<string, Job>()

export const portraitHandlers = [
  // Demande de génération : les axes sont dans le corps, la référence est le portrait de l'expert.
  http.post(`${API_BASE}/agents/:agentId/portrait`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const agentId = String(params.agentId)
    if (!ROSTER.some((expert) => expert.id === agentId)) return notFound('Expert introuvable.')

    const id = crypto.randomUUID()
    jobs.set(id, { id, agentId, createdAt: Date.now(), crops: ['buste'] })
    return HttpResponse.json({ id, status: 'pending', variants: [] }, { status: 202 })
  }),

  http.get(`${API_BASE}/agents/:agentId/portrait/:jobId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const job = jobs.get(String(params.jobId))
    if (!job || job.agentId !== String(params.agentId)) return notFound('Génération introuvable.')

    if (Date.now() - job.createdAt < GENERATION_MS) {
      return HttpResponse.json({ id: job.id, status: 'pending', variants: [] })
    }

    // `url: null` = l'interface retombe sur le portrait de référence de l'expert.
    // Le back-office renverra ici l'URL de l'image produite.
    return HttpResponse.json({
      id: job.id,
      status: 'ready',
      variants: job.crops.map((crop, index) => ({ id: `${job.id}-${index}`, url: null, crop })),
    })
  }),
]
