const HERMES_EXPERTS = {
  exp_adjoua: 'adjoua',
  exp_djeneba: 'djeneba',
  exp_lokoli: 'lokoli',
} as const

function slug(value: string): string {
  return value.trim().toLocaleLowerCase('en-US').replace(/[^a-z0-9_-]+/g, '-')
}

export function hermesRuntimeAgentId(frontAgentId: string): string | null {
  return HERMES_EXPERTS[frontAgentId as keyof typeof HERMES_EXPERTS] ?? null
}

export function hermesOnboardingConversationId(organizationId: string): string {
  return `prise-de-poste-${slug(organizationId)}`
}

export function hermesConversationId(organizationId: string, suffix: string): string {
  return `conversation-${slug(organizationId)}-${slug(suffix)}`
}

export function hermesConversationStorageKey(
  frontAgentId: string,
  organizationId: string,
  conversationId: string,
): string {
  const runtimeAgentId = hermesRuntimeAgentId(frontAgentId)
  if (!runtimeAgentId) throw new Error(`L'expert ${frontAgentId} n'est pas branché à Hermes.`)
  return `yelema.hermes.v1:${slug(organizationId)}:${runtimeAgentId}:${slug(conversationId)}`
}
