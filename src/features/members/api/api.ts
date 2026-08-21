import { apiRequest } from '../../../shared/api/client/http-client'
import type { AddMemberRequest, Member, MemberStatus, RoleDefinition } from './contracts'
import { toExcludedAgentIds, toMember, toToolRestrictions, type RealMember } from './member-adapter'

interface Paginated<T> {
  items: T[]
  totalCount: number
  skip: number
  limit: number
  hasMore: boolean
}

/**
 * Tous les experts du catalogue Yelema, equipe et marketplace confondues.
 *
 * ATTENTION — ce n'est PAS l'inventaire de l'organisation : celui-ci depend du
 * plan souscrit et n'est connu que du back-office. `/agents` ne renvoie que ce
 * a quoi le membre CONNECTE a acces, ce qui en fait une base fausse pour
 * accorder des droits a quelqu'un d'autre. En attendant que le back expose
 * l'inventaire, on prend l'union des deux listes.
 */
async function fetchEntitledAgentIds(): Promise<string[]> {
  const [team, catalogue] = await Promise.all([
    apiRequest<{ id: string }[]>('/agents'),
    apiRequest<{ id: string }[]>('/agents/marketplace').catch((): { id: string }[] => []),
  ])
  return [...new Set([...team, ...catalogue].map((agent) => agent.id))]
}

export async function listMembers(): Promise<Member[]> {
  // `skip` doit être un multiple de `limit` (pagination Payload) ; limit max 100.
  const [envelope, allAgentIds] = await Promise.all([
    apiRequest<Paginated<RealMember>>('/members?skip=0&limit=100'),
    fetchEntitledAgentIds(),
  ])
  return envelope.items.map((item) => toMember(item, allAgentIds))
}

export async function getMember(memberId: string): Promise<Member> {
  const [real, allAgentIds] = await Promise.all([
    apiRequest<RealMember>(`/members/${memberId}`),
    fetchEntitledAgentIds(),
  ])
  return toMember(real, allAgentIds)
}

export async function addMember(payload: AddMemberRequest): Promise<Member> {
  const allAgentIds = await fetchEntitledAgentIds()
  const body: Record<string, unknown> = { email: payload.email }
  if (payload.name) body.name = payload.name
  // Les permissions cochees partent telles quelles : le serveur reste
  // l'autorite, il refusera toute paire capacite:action inconnue.
  if (payload.permissionKeys?.length) body.permissions = payload.permissionKeys
  const toolRestrictions = toToolRestrictions(payload.excludedAgentIds, allAgentIds)
  if (toolRestrictions) body.toolRestrictions = toolRestrictions
  const created = await apiRequest<RealMember>('/members', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return toMember(created, allAgentIds)
}

export async function setMemberRole(memberId: string, roleKey: string): Promise<Member> {
  const [real, allAgentIds] = await Promise.all([
    apiRequest<RealMember>(`/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: roleKey }),
    }),
    fetchEntitledAgentIds(),
  ])
  return toMember(real, allAgentIds)
}

/** Regler les permissions d'un membre deja invite. */
export async function setMemberPermissions(memberId: string, permissionKeys: string[]): Promise<Member> {
  const [real, allAgentIds] = await Promise.all([
    apiRequest<RealMember>(`/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions: permissionKeys }),
    }),
    fetchEntitledAgentIds(),
  ])
  return toMember(real, allAgentIds)
}

export async function setMemberExcludedAgents(memberId: string, excludedAgentIds: string[]): Promise<Member> {
  const allAgentIds = await fetchEntitledAgentIds()
  const toolRestrictions = toToolRestrictions(excludedAgentIds, allAgentIds) ?? []
  const real = await apiRequest<RealMember>(`/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ toolRestrictions }),
  })
  return toMember(real, allAgentIds)
}

export function setMemberStatus(memberId: string, status: MemberStatus): Promise<unknown> {
  return apiRequest(`/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: status === 'pending' ? 'invited' : status }),
  })
}

/** Suppression douce : le membre passe `suspended` (restauration possible côté API). */
export function deleteMember(memberId: string): Promise<void> {
  return apiRequest(`/members/${memberId}`, { method: 'DELETE' })
}

export function listRoles(): Promise<RoleDefinition[]> {
  return apiRequest('/roles')
}

export { toExcludedAgentIds }
