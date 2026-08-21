import { apiRequest } from '../../../shared/api/client/http-client'
import { deriveMetiers, toAgentDetail, toAgentSummary, type RealAgent, type RealAgentDetail } from './agent-adapter'
import type { AgentAvatarConfig, AgentDetail, AgentProfile, AgentResource, AgentResources, AgentSummary, Metier, PortraitJob, RecruitmentRequest } from './contracts'

/**
 * GET /agents (réel) : tableau nu, déjà filtré aux agents auxquels le membre
 * a droit (plan ∩ toolRestrictions). Pas de paramètres serveur : la recherche
 * et le filtre métier se font côté client (volume borné).
 */
function fetchRealAgents(): Promise<RealAgent[]> {
  return apiRequest<RealAgent[]>('/agents')
}

export async function listMetiers(): Promise<Metier[]> {
  return deriveMetiers(await fetchRealAgents())
}

export async function listAgents(params: { metier?: string; q?: string } = {}): Promise<AgentSummary[]> {
  const agents = await fetchRealAgents()
  const query = params.q?.trim().toLocaleLowerCase('fr')
  const filtered = agents.filter((agent) => {
    const matchesMetier = !params.metier || params.metier === 'all' || (agent.suite?.key ?? 'autres') === params.metier
    const matchesQuery = !query || agent.displayName.toLocaleLowerCase('fr').includes(query)
    return matchesMetier && matchesQuery
  })
  return filtered.map(toAgentSummary)
}

/**
 * Marketplace : les experts IA du catalogue Yelema que l'organisation n'a pas
 * encore recrutés, avec l'état de la demande éventuellement déjà envoyée.
 */
export async function listMarketplaceAgents(): Promise<AgentSummary[]> {
  const agents = await apiRequest<RealAgent[]>('/agents/marketplace')
  return agents.map(toAgentSummary)
}

/** Fiche d'un expert de la marketplace : sa présentation, avant recrutement. */
export async function getMarketplaceAgent(agentId: string): Promise<AgentDetail> {
  const agent = await apiRequest<RealAgentDetail>(`/agents/marketplace/${agentId}`)
  return toAgentDetail(agent)
}

/**
 * Recrute l'expert : il rejoint immédiatement l'équipe, joignable sur le canal
 * retenu, et quitte le catalogue.
 */
export async function recruitAgent(agentId: string, payload: RecruitmentRequest): Promise<AgentSummary> {
  const agent = await apiRequest<RealAgent>(`/agents/${agentId}/recruit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toAgentSummary(agent)
}

/** Réglages de personnalité de l'expert, propres à l'organisation. */
export function getAgentProfile(agentId: string): Promise<AgentProfile> {
  return apiRequest(`/agents/${agentId}/profile`)
}

export function updateAgentProfile(agentId: string, profile: AgentProfile): Promise<AgentProfile> {
  return apiRequest(`/agents/${agentId}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(profile),
  })
}

/**
 * Ressources accessibles à un expert : les siennes, plus celles que ses
 * collègues acceptent de partager. Le filtrage par consentement est appliqué
 * par le serveur — l'interface affiche ce qu'elle reçoit.
 */
export function listAgentResources(agentId: string): Promise<AgentResources> {
  return apiRequest(`/agents/${agentId}/resources`)
}

export async function getAgent(agentId: string): Promise<AgentDetail> {
  // Hors droit ou autre tenant ⇒ 404 (l'API ne révèle pas l'existence).
  // La fiche est enrichie (description + skills) par le handler MSW hybride
  // en attendant que le back expose le contrat « employé IA ».
  const agent = await apiRequest<RealAgentDetail>(`/agents/${agentId}`)
  return toAgentDetail(agent)
}

/**
 * Demande un portrait : la photo de référence de l'expert et les quatre axes
 * partent à la génération. La production étant asynchrone, la réponse est un
 * travail dont on suit l'état.
 */
export function requestPortrait(agentId: string, config: AgentAvatarConfig): Promise<PortraitJob> {
  return apiRequest(`/agents/${agentId}/portrait`, {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export function getPortraitJob(agentId: string, jobId: string): Promise<PortraitJob> {
  return apiRequest(`/agents/${agentId}/portrait/${jobId}`)
}

/**
 * Demande d'un expert SUR MESURE : un métier que le catalogue ne couvre pas.
 * Ce n'est pas un recrutement — rien ne rejoint l'équipe, la demande part au
 * cadrage.
 */
export interface ExpertRequest {
  need: string
  /** Obligatoire : sans metier, la demande n'est pas cadrable. */
  metier: string
  /** Nature des donnees que l'expert devra exploiter. Au moins une. */
  dataKinds: string[]
}

export interface ExpertRequestReceipt {
  id: string
  need: string
  status: string
  createdAt: string
}

export function requestCustomExpert(payload: ExpertRequest): Promise<ExpertRequestReceipt> {
  return apiRequest('/agents/requests', { method: 'POST', body: JSON.stringify(payload) })
}

/**
 * Partager ou retirer du partage UNE ressource de l'expert. Le serveur reste
 * l'autorité : il refuse toute pièce qui n'appartient pas à cet expert.
 */
export function shareAgentResource(agentId: string, resourceId: string, shared: boolean): Promise<AgentResource> {
  return apiRequest(`/agents/${agentId}/resources/${resourceId}`, { method: 'PATCH', body: JSON.stringify({ shared }) })
}

/** Supprimer une ressource de l'expert. Sans effet sur celles de ses collègues. */
export function deleteAgentResource(agentId: string, resourceId: string): Promise<void> {
  return apiRequest(`/agents/${agentId}/resources/${resourceId}`, { method: 'DELETE' })
}
