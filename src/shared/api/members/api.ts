import { apiRequest } from '../client/http-client'
import type { AddMemberRequest, CapabilityDefinition, Member } from './contracts'

export function listMembers(): Promise<Member[]> {
  return apiRequest('/members')
}

export function getMember(memberId: string): Promise<Member> {
  return apiRequest(`/members/${memberId}`)
}

export function addMember(payload: AddMemberRequest): Promise<Member> {
  return apiRequest('/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function setMemberCapabilities(memberId: string, capabilities: string[]): Promise<Member> {
  return apiRequest(`/members/${memberId}/capabilities`, {
    method: 'PATCH',
    body: JSON.stringify({ capabilities }),
  })
}

export function setMemberExcludedAgents(memberId: string, excludedAgentIds: string[]): Promise<Member> {
  return apiRequest(`/members/${memberId}/agents`, {
    method: 'PATCH',
    body: JSON.stringify({ excludedAgentIds }),
  })
}

export function deleteMember(memberId: string): Promise<void> {
  return apiRequest(`/members/${memberId}`, { method: 'DELETE' })
}

export function listCapabilities(): Promise<CapabilityDefinition[]> {
  return apiRequest('/capabilities')
}
