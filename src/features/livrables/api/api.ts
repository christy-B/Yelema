import { apiFetch, apiRequest } from '../../../shared/api/client/http-client'
import type { Livrable, LivrablePeriode } from './contracts'

export function listLivrables(params: { q?: string; agent?: string; periode?: LivrablePeriode } = {}): Promise<Livrable[]> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.agent) search.set('agent', params.agent)
  if (params.periode) search.set('periode', params.periode)
  const query = search.toString()
  return apiRequest(`/livrables${query ? `?${query}` : ''}`)
}

export function downloadLivrable(livrableId: string): Promise<Response> {
  return apiFetch(`/livrables/${livrableId}/download`)
}
