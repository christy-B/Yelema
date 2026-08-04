import type { Member, MemberStatus } from './contracts'

/** DTO RÉEL de /members (control-plane, v1). */
export interface RealMember {
  id: string
  email: string
  name: string | null
  status: string
  isFirstAdmin: boolean
  role: { key: string; name: string } | null
  /** Allow-list : vide ⇒ hérite de tous les outils du plan ; non vide ⇒ intersection. */
  toolRestrictions: string[]
  createdAt?: string
  updatedAt?: string
}

const STATUS_MAP: Record<string, MemberStatus> = {
  active: 'active',
  invited: 'pending',
  suspended: 'suspended',
}

const AVATAR_COLORS = ['#C4703C', '#3C7CC4', '#5FA05A', '#8B5CB8', '#C43C6E', '#3CA8A0']

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('fr') ?? '')
    .join('')
}

function colorOf(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 997
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/**
 * L'API réelle porte une allow-list (`toolRestrictions`) ; l'interface raisonne
 * en exclusions (« par défaut tous ; décochez pour retirer »). Conversion via
 * la liste complète des agents accessibles du plan.
 */
export function toExcludedAgentIds(toolRestrictions: string[], allAgentIds: string[]): string[] {
  if (toolRestrictions.length === 0) return []
  return allAgentIds.filter((id) => !toolRestrictions.includes(id))
}

/**
 * Conversion inverse. Retourne `undefined` quand rien n'est exclu (⇒ ne pas
 * envoyer de restriction : le membre hérite de tout le plan). Retirer TOUS les
 * agents est inexprimable dans l'API (liste vide = tout) : on refuse.
 */
export function toToolRestrictions(excludedAgentIds: string[], allAgentIds: string[]): string[] | undefined {
  if (excludedAgentIds.length === 0) return undefined
  const allowed = allAgentIds.filter((id) => !excludedAgentIds.includes(id))
  if (allowed.length === 0) {
    throw new Error('Impossible de retirer tous les agents : laissez au moins un agent accessible.')
  }
  return allowed
}

export function toMember(real: RealMember, allAgentIds: string[]): Member {
  const name = real.name ?? real.email
  return {
    id: real.id,
    name,
    email: real.email,
    initials: initialsOf(name),
    color: colorOf(real.id),
    status: STATUS_MAP[real.status] ?? 'active',
    isFirstAdmin: real.isFirstAdmin,
    role: real.role,
    excludedAgentIds: toExcludedAgentIds(real.toolRestrictions, allAgentIds),
  }
}
