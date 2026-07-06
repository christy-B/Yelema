import type { Member } from '../../members/contracts'
import membersFixture from '../fixtures/members.json'

/**
 * Store partagé des membres : source unique pour les handlers (members, agents,
 * conversations) afin que les exclusions d'agents modifiées via PATCH soient
 * immédiatement appliquées au contrôle d'accès.
 */
let members = structuredClone(membersFixture) as Member[]

export function listMemberRecords(): Member[] {
  return members
}

export function findMemberRecord(id: string): Member | undefined {
  return members.find((member) => member.id === id)
}

export function addMemberRecord(member: Member): void {
  members = [...members, member]
}

export function removeMemberRecord(id: string): void {
  members = members.filter((member) => member.id !== id)
}

/** Agents retirés au membre (allow-by-default : [] ⇒ accès à tout). */
export function excludedAgentIdsFor(userId: string | undefined): string[] {
  if (!userId) return []
  return findMemberRecord(userId)?.excludedAgentIds ?? []
}
