import { http, HttpResponse } from 'msw'

import type { Livrable } from '../../../../features/livrables/api/contracts'
import livrablesFixture from '../fixtures/livrables.json'
import { API_BASE, getAuthenticatedUser, notFound, requireAuth } from './helpers'

/**
 * Livrables produits par les employés IA — domaine RUNTIME (comme les
 * conversations), simulé en attendant le gateway. Les livrables sont privés
 * par membre ; leurs agents sont résolus vers les agents RÉELS par nom.
 */
export interface LivrableRecord extends Omit<Livrable, 'agentId'> {
  userId: string
  agentId?: string
}

const livrables = structuredClone(livrablesFixture) as LivrableRecord[]

/** Utilisé par les automatisations : une exécution produit un livrable. */
export function addLivrableRecord(record: LivrableRecord): void {
  livrables.unshift(record)
}

// Même rattachement que les conversations de démo : par email des comptes seed.
const LEGACY_OWNER_EMAILS: Record<string, string> = {
  u_12: 'admin@banque-atlantique.ci',
  u_18: 'facturation@banque-atlantique.ci',
}

let agentsResolved = false

async function resolveAgentIds(request: Request): Promise<void> {
  if (agentsResolved) return
  const authorization = request.headers.get('Authorization')
  if (!authorization) return
  try {
    const response = await fetch(`${API_BASE}/agents`, { headers: { Authorization: authorization } })
    if (!response.ok) return
    const agents = (await response.json()) as { id: string; displayName: string }[]
    if (!agents.length) return
    const idByName = new Map(agents.map((agent) => [agent.displayName, agent.id]))
    for (const livrable of livrables) {
      livrable.agentId = idByName.get(livrable.agentName) ?? livrable.agentId ?? ''
    }
    agentsResolved = true
  } catch {
    // API agents momentanément indisponible : on retentera au prochain appel.
  }
}

const PERIODE_DAYS: Record<string, number> = { '7d': 7, '30d': 30 }

export const livrableHandlers = [
  http.get(`${API_BASE}/livrables`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized
    await resolveAgentIds(request)

    const searchParams = new URL(request.url).searchParams
    const query = searchParams.get('q')?.trim().toLocaleLowerCase('fr')
    const agent = searchParams.get('agent')
    const periode = searchParams.get('periode')
    const days = periode ? PERIODE_DAYS[periode] : undefined
    const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : undefined

    const result = livrables
      .filter((livrable) => {
        if (livrable.userId !== currentUser.id && LEGACY_OWNER_EMAILS[livrable.userId] !== currentUser.email) return false
        const matchesQuery = !query || `${livrable.title} ${livrable.agentName} ${livrable.skill}`.toLocaleLowerCase('fr').includes(query)
        const matchesAgent = !agent || agent === 'all' || livrable.agentId === agent
        const matchesPeriode = !since || new Date(livrable.createdAt).getTime() >= since
        return matchesQuery && matchesAgent && matchesPeriode
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => {
        const { userId: _owner, ...livrable } = record
        void _owner // champ interne, jamais renvoyé au front
        return { ...livrable, agentId: livrable.agentId ?? '' }
      })

    return HttpResponse.json(result)
  }),

  http.get(`${API_BASE}/livrables/:livrableId/download`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const livrable = livrables.find((item) => item.id === params.livrableId)
    if (!livrable) return notFound('Livrable introuvable.')
    return new HttpResponse(`Contenu simulé du livrable « ${livrable.title} » (${livrable.format}).`, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${livrable.title}.txt"`,
      },
    })
  }),
]
