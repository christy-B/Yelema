import { http, HttpResponse } from 'msw'

import { ROSTER, type RosterExpert } from '../../../../features/agents/roster'
import type { FileItem } from '../../../../features/files/api/contracts'
import filesFixture from '../fixtures/files.json'
import livrablesFixture from '../fixtures/livrables.json'
import { sharesResources } from '../stores/agent-profile.store'
import { API_BASE, notFound, requireAuth } from './helpers'

/**
 * RESSOURCES D'UN EMPLOYÉ IA — ses sources de données et ses artefacts, plus
 * celles que ses collègues acceptent de partager.
 *
 * Le filtrage est fait ici, côté serveur : un employé qui refuse le partage voit
 * son travail rester dans son espace, quelle que soit l'interface. L'autorité
 * est le réglage `shareResources` de son profil.
 */

const TEAM_AGENT_IDS = new Set(['exp_kouassi', 'exp_awa', 'exp_mamadou', 'exp_salif'])
const teamAgents = () => ROSTER.filter((expert) => TEAM_AGENT_IDS.has(expert.id))

const files = filesFixture.files as FileItem[]
// Les artefacts du jeu de données portent le nom de leur auteur (l'identifiant
// est dérivé côté /livrables) : on rattache donc par nom, comme pour les sources.
const artefacts = livrablesFixture as { id: string; title: string; type: string; format: string; agentName: string; size: string }[]

interface ResourceDto {
  id: string
  name: string
  kind: 'source' | 'artefact'
  /** Nature lisible : « PDF · 28 pages », « Tableau · XLSX »… */
  meta: string
  size: string
  ownerId: string
  ownerName: string
  /** Métier de l'auteur — sert au regroupement dans le sélecteur. */
  ownerMetier: string
}

/** Sources et artefacts appartenant à un employé, dans un format commun. */
function resourcesOf(expert: RosterExpert): ResourceDto[] {
  const owner = { ownerId: expert.id, ownerName: expert.name, ownerMetier: expert.metier }
  const sources = files
    .filter((file) => file.agent === expert.name)
    .map<ResourceDto>((file) => ({
      id: file.id,
      name: file.name,
      kind: 'source',
      meta: file.kind,
      size: file.size,
      ...owner,
    }))
  const produced = artefacts
    .filter((artefact) => artefact.agentName === expert.name)
    .map<ResourceDto>((artefact) => ({
      id: artefact.id,
      name: artefact.title,
      kind: 'artefact',
      meta: `${artefact.format} · ${artefact.type.toUpperCase()}`,
      size: artefact.size,
      ...owner,
    }))
  return [...sources, ...produced]
}

export const resourceHandlers = [
  http.get(`${API_BASE}/agents/:agentId/resources`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const agentId = String(params.agentId)
    const team = teamAgents()
    const expert = team.find((item) => item.id === agentId)
    if (!expert) return notFound('Employé IA introuvable.')

    // Ce que les collègues mettent à disposition : leur consentement fait foi.
    const shared = team
      .filter((item) => item.id !== agentId && sharesResources(item.id))
      .flatMap((item) => resourcesOf(item))

    return HttpResponse.json({
      own: resourcesOf(expert),
      shared,
      /** Employés de l'équipe qui gardent leur travail pour leurs propres tâches. */
      withheldBy: team
        .filter((item) => item.id !== agentId && !sharesResources(item.id))
        .map((item) => item.name),
    })
  }),
]
