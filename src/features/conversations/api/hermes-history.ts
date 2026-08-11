import type { ConversationStatus, Message } from './contracts.ts'
import { hermesConversationStorageKey } from './hermes-routing.ts'

export interface HermesStorage {
  readonly length: number
  clear(): void
  getItem(key: string): string | null
  key(index: number): string | null
  removeItem(key: string): void
  setItem(key: string, value: string): void
}

export interface HermesStoredConversation {
  id: string
  agentId: string
  organizationId: string
  userId: string
  owner: string
  title: string
  status?: ConversationStatus
  messages: Message[]
  createdAt: string
  updatedAt: string
}

function parseConversation(value: string | null): HermesStoredConversation | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<HermesStoredConversation>
    if (
      typeof parsed.id !== 'string'
      || typeof parsed.agentId !== 'string'
      || typeof parsed.organizationId !== 'string'
      || typeof parsed.userId !== 'string'
      || typeof parsed.owner !== 'string'
      || typeof parsed.title !== 'string'
      || !Array.isArray(parsed.messages)
      || typeof parsed.createdAt !== 'string'
      || typeof parsed.updatedAt !== 'string'
    ) return null
    return parsed as HermesStoredConversation
  } catch {
    return null
  }
}

export function saveStoredHermesConversation(storage: HermesStorage, conversation: HermesStoredConversation): void {
  const key = hermesConversationStorageKey(
    conversation.agentId,
    conversation.organizationId,
    conversation.id,
    conversation.userId,
  )
  storage.setItem(key, JSON.stringify(conversation))
}

export function loadStoredHermesConversation(
  storage: HermesStorage,
  frontAgentId: string,
  organizationId: string,
  conversationId: string,
  userId?: string,
): HermesStoredConversation | null {
  if (userId) {
    const scoped = parseConversation(storage.getItem(
      hermesConversationStorageKey(frontAgentId, organizationId, conversationId, userId),
    ))
    if (scoped?.userId === userId) return scoped
  }
  const legacy = parseConversation(storage.getItem(
    hermesConversationStorageKey(frontAgentId, organizationId, conversationId),
  ))
  return !userId || legacy?.userId === userId ? legacy : null
}

export function listStoredHermesConversations(
  storage: HermesStorage,
  frontAgentId: string,
  organizationId: string,
  userId?: string,
): HermesStoredConversation[] {
  const marker = '__prefix__'
  const prefixes = [
    ...(userId
      ? [hermesConversationStorageKey(frontAgentId, organizationId, marker, userId).replace(marker, '')]
      : []),
    hermesConversationStorageKey(frontAgentId, organizationId, marker).replace(marker, ''),
  ]
  const conversations = new Map<string, HermesStoredConversation>()
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key || !prefixes.some((prefix) => key.startsWith(prefix))) continue
    const conversation = parseConversation(storage.getItem(key))
    if (
      conversation
      && conversation.agentId === frontAgentId
      && conversation.organizationId.toLocaleLowerCase('en-US') === organizationId.toLocaleLowerCase('en-US')
      && (!userId || conversation.userId === userId)
    ) {
      const previous = conversations.get(conversation.id)
      if (!previous || Date.parse(conversation.updatedAt) >= Date.parse(previous.updatedAt)) {
        conversations.set(conversation.id, conversation)
      }
    }
  }
  return [...conversations.values()].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
}
