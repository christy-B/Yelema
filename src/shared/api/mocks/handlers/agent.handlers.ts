import { http, HttpResponse } from 'msw'

import type { AgentDetail, Metier } from '../../agent/contracts'
import agentsFixture from '../fixtures/agents.json'
import metiersFixture from '../fixtures/metiers.json'
import { API_BASE, forbidden, getAuthenticatedUserId, notFound, requireAuth } from './helpers'
import { excludedAgentIdsFor } from './member-store'

const agents = structuredClone(agentsFixture) as AgentDetail[]
const metiers = structuredClone(metiersFixture) as Metier[]

export const agentHandlers = [
  http.get(`${API_BASE}/metiers`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json(metiers)
  }),

  http.get(`${API_BASE}/agents`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    // Accès agent appliqué côté serveur : agents du workspace − agents retirés au membre.
    const excluded = excludedAgentIdsFor(getAuthenticatedUserId(request))
    const accessible = agents.filter((agent) => !excluded.includes(agent.id))

    const searchParams = new URL(request.url).searchParams
    const metier = searchParams.get('metier')
    const query = searchParams.get('q')?.trim().toLocaleLowerCase('fr')

    let result = accessible
    // La recherche prime sur le filtre métier (comme le prototype).
    if (query) {
      result = accessible.filter((agent) => `${agent.name} ${agent.description} ${agent.tags.join(' ')}`.toLocaleLowerCase('fr').includes(query))
    } else if (metier && metier !== 'all') {
      const group = metiers.find((item) => item.id === metier)
      const ids = group?.agentIds ?? []
      result = ids.map((id) => accessible.find((agent) => agent.id === id)).filter((agent): agent is AgentDetail => Boolean(agent))
    }

    return HttpResponse.json(result)
  }),

  http.get(`${API_BASE}/agents/:agentId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const agent = agents.find((item) => item.id === params.agentId)
    if (!agent) return notFound('Agent introuvable.')

    const excluded = excludedAgentIdsFor(getAuthenticatedUserId(request))
    if (excluded.includes(agent.id)) return forbidden('Vous n’avez pas accès à cet agent.')

    return HttpResponse.json(agent)
  }),
]
