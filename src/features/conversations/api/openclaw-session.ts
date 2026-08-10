/**
 * OpenClaw canonicalise les clés de session en minuscules. Le front doit
 * produire directement cette forme, sinon les événements de chat reçus ne
 * correspondent pas à la clé attendue lorsque l'identifiant contient des
 * majuscules (notamment certains identifiants d'organisation).
 */
function safeSessionSegment(value: string, maxLength = 180): string {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, maxLength)
    .toLocaleLowerCase('en-US')
}

export function openClawSessionKey(runtimeAgentId: string, conversationId: string): string {
  const safeConversationId = safeSessionSegment(conversationId)
  return `agent:${runtimeAgentId.toLocaleLowerCase('en-US')}:yelema-${safeConversationId}`
}

/** Identifiant d'un nouveau fil, attribuable sans ambiguïté à une organisation. */
export function openClawConversationId(organizationId: string, uniqueId: string): string {
  return `conversation-${safeSessionSegment(organizationId, 72)}-${safeSessionSegment(uniqueId, 72)}`
}

/** Identifiant stable de la prise de poste d'un expert dans une organisation. */
export function openClawOnboardingConversationId(organizationId: string): string {
  return `prise-de-poste-${safeSessionSegment(organizationId, 120)}`
}

/**
 * Extrait uniquement les fils Yelema attribuables à l'organisation courante.
 * Les anciens UUID sans tenant ne sont volontairement pas devinés : ce serait
 * une fuite potentielle entre organisations partageant le même Gateway.
 */
export function openClawConversationIdFromSessionKey(
  runtimeAgentId: string,
  organizationId: string,
  key: string,
): string | null {
  const prefix = `agent:${runtimeAgentId.toLocaleLowerCase('en-US')}:yelema-`
  if (!key.toLocaleLowerCase('en-US').startsWith(prefix)) return null

  const conversationId = key.slice(prefix.length).toLocaleLowerCase('en-US')
  const onboardingId = openClawOnboardingConversationId(organizationId)
  const organizationPrefix = `conversation-${safeSessionSegment(organizationId, 72)}-`
  if (conversationId === onboardingId || conversationId.startsWith(organizationPrefix)) return conversationId
  return null
}
