import type { ConversationSummary } from './contracts.ts'

/**
 * La prise de poste initialise le chat, mais ne représente pas une tâche
 * confiée par l'utilisateur et ne doit donc pas apparaître dans l'activité.
 */
export function userActivityConversations(conversations: ConversationSummary[]): ConversationSummary[] {
  return conversations.filter((conversation) => conversation.onboardingOnly !== true)
}

/**
 * Les profils reliés à Hermes utilisent exclusivement leur historique local
 * réel. Les fixtures MSW restent disponibles pour les experts encore simulés.
 */
export function conversationHistoryForAgent(
  usesHermes: boolean,
  simulated: ConversationSummary[],
  hermes: ConversationSummary[],
): ConversationSummary[] {
  return usesHermes ? hermes : simulated
}

/**
 * À l'ouverture d'un profil Hermes, reprendre le dernier échange utilisateur.
 * Sans échange réel, ouvrir la prise de poste afin que l'agent se présente.
 */
export function defaultHermesConversationId(
  conversations: ConversationSummary[],
  onboardingId: string,
): string {
  const latest = userActivityConversations(conversations)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]
  return latest?.id ?? onboardingId
}
