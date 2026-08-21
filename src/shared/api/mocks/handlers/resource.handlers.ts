import { http, HttpResponse } from 'msw'

import { ROSTER, type RosterExpert } from '../../../../features/agents/roster'
import type { FileItem } from '../../../../features/files/api/contracts'
import filesFixture from '../fixtures/files.json'
import livrablesFixture from '../fixtures/livrables.json'
import { sharesResources } from '../stores/agent-profile.store'
import { isInTeam } from '../stores/team.store'
import { isRemoved, isShared, remove, setShared } from '../stores/resource-sharing.store'
import { API_BASE, notFound, requireAuth } from './helpers'

/**
 * RESSOURCES D'UN EMPLOYÉ IA — ses sources de données et ses artefacts, plus
 * celles que ses collègues acceptent de partager.
 *
 * Le filtrage est fait ici, côté serveur : un employé qui refuse le partage voit
 * son travail rester dans son espace, quelle que soit l'interface. L'autorité
 * est le réglage `shareResources` de son profil.
 */

const teamAgents = () => ROSTER.filter((expert) => isInTeam(expert.id))

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
  /** Cette pièce est-elle mise à disposition des autres experts ? */
  shared: boolean
}

/** Sources et artefacts appartenant à un employé, dans un format commun. */
function resourcesOf(expert: RosterExpert): ResourceDto[] {
  // Le réglage global du profil sert de valeur par défaut ; chaque pièce peut
  // ensuite être ouverte ou refermée individuellement.
  const defaut = sharesResources(expert.id)
  const owner = { ownerId: expert.id, ownerName: expert.name, ownerMetier: expert.metier }
  const sources = files
    .filter((file) => file.agent === expert.name)
    .map<ResourceDto>((file) => ({
      id: file.id,
      name: file.name,
      kind: 'source',
      meta: file.kind,
      size: file.size,
      shared: isShared(file.id, defaut),
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
      shared: isShared(artefact.id, defaut),
      ...owner,
    }))
  // Une pièce supprimée disparaît pour tout le monde, propriétaire compris.
  return [...sources, ...produced].filter((item) => !isRemoved(item.id))
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
      .filter((item) => item.id !== agentId)
      .flatMap((item) => resourcesOf(item))
      .filter((item) => item.shared)

    return HttpResponse.json({
      own: resourcesOf(expert),
      shared,
      /** Employés de l'équipe qui gardent leur travail pour leurs propres tâches. */
      withheldBy: team
        .filter((item) => item.id !== agentId && resourcesOf(item).every((piece) => !piece.shared))
        .map((item) => item.name),
    })
  }),

  /**
   * Partager ou retirer du partage UNE ressource. La décision est prise par
   * l'expert propriétaire ; le serveur reste l'autorité, l'écran ne fait que
   * refléter ce qu'il renvoie.
   */
  http.patch(`${API_BASE}/agents/:agentId/resources/:resourceId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const expert = teamAgents().find((item) => item.id === String(params.agentId))
    if (!expert) return notFound('Employé IA introuvable.')
    const resourceId = String(params.resourceId)
    const piece = resourcesOf(expert).find((item) => item.id === resourceId)
    // On ne partage que ce qui nous appartient : une pièce d'un collègue n'est
    // pas modifiable ici, quelle que soit la requête.
    if (!piece) return notFound('Ressource introuvable pour cet expert.')
    const body = (await request.json()) as { shared?: unknown }
    if (typeof body.shared !== 'boolean') return notFound('Le partage attend un booléen.')
    setShared(resourceId, body.shared)
    return HttpResponse.json({ ...piece, shared: body.shared })
  }),

  /** Supprimer une ressource — uniquement celles de l'expert lui-même. */
  http.delete(`${API_BASE}/agents/:agentId/resources/:resourceId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const expert = teamAgents().find((item) => item.id === String(params.agentId))
    if (!expert) return notFound('Employé IA introuvable.')
    const resourceId = String(params.resourceId)
    if (!resourcesOf(expert).some((item) => item.id === resourceId)) {
      return notFound('Ressource introuvable pour cet expert.')
    }
    remove(resourceId)
    return new HttpResponse(null, { status: 204 })
  }),
]
