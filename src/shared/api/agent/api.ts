import { apiRequest } from '../client/http-client'
import type { AgentDetail, AgentSummary, Metier } from './contracts'

export function listMetiers(): Promise<Metier[]> {
  return apiRequest('/metiers')
}

export function listAgents(params: { metier?: string; q?: string } = {}): Promise<AgentSummary[]> {
  const search = new URLSearchParams()
  if (params.metier) search.set('metier', params.metier)
  if (params.q) search.set('q', params.q)
  const query = search.toString()
  return apiRequest(`/agents${query ? `?${query}` : ''}`)
}

export function getAgent(agentId: string): Promise<AgentDetail> {
  return apiRequest(`/agents/${agentId}`)
}
