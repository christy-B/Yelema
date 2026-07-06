export type MemberStatus = 'active' | 'pending' | 'suspended'

export interface Member {
  id: string
  name: string
  email: string
  initials?: string
  color?: string
  status: MemberStatus
  capabilities: string[]
  excludedAgentIds: string[]
}

export interface CapabilityDefinition {
  key: string
  label: string
}

export interface AddMemberRequest {
  email: string
  capabilities: string[]
  excludedAgentIds: string[]
}
