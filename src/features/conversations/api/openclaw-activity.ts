import type { ConversationSummary } from './contracts'
import { openClawConversationIdFromSessionKey, openClawOnboardingConversationId } from './openclaw-session.ts'

const CLIENT_CONTEXT_START = '<yelema_client_context>'
const CLIENT_CONTEXT_END = '</yelema_client_context>'
const INITIALIZATION_TASK_START = '<yelema_initialization_task>'
const INITIALIZATION_TASK_END = '</yelema_initialization_task>'

interface SessionRow {
  key?: unknown
  label?: unknown
  displayName?: unknown
  derivedTitle?: unknown
  lastMessagePreview?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

interface ConversationMappingParams {
  sessions: unknown[]
  runtimeAgentId: string
  frontAgentId: string
  organizationId: string
  userId: string
  owner: string
  now?: number
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function withoutBlock(value: string, startMarker: string, endMarker: string): string {
  let result = value
  let start = result.indexOf(startMarker)
  while (start >= 0) {
    const end = result.indexOf(endMarker, start)
    if (end < 0) return result.slice(0, start)
    result = `${result.slice(0, start)} ${result.slice(end + endMarker.length)}`
    start = result.indexOf(startMarker)
  }
  return result
}

/** Retire les instructions internes avant d'exposer un sujet ou un aperçu. */
export function visibleOpenClawActivityText(value: unknown): string {
  const raw = text(value)
  if (!raw) return ''
  return withoutBlock(
    withoutBlock(raw, CLIENT_CONTEXT_START, CLIENT_CONTEXT_END),
    INITIALIZATION_TASK_START,
    INITIALIZATION_TASK_END,
  ).replace(/\s+/g, ' ').trim()
}

function timestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function relativeTime(value: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - value) / 60_000))
  if (minutes < 2) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  return `${Math.round(days / 7)} sem.`
}

function shortTitle(value: string): string {
  if (value.length <= 72) return value
  return `${value.slice(0, 69).trimEnd()}…`
}

/** Convertit l'index Gateway en activités privées de l'organisation courante. */
export function openClawActivityConversations({
  sessions,
  runtimeAgentId,
  frontAgentId,
  organizationId,
  userId,
  owner,
  now = Date.now(),
}: ConversationMappingParams): ConversationSummary[] {
  const onboardingId = openClawOnboardingConversationId(organizationId)
  const conversations = sessions.flatMap((raw): ConversationSummary[] => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
    const row = raw as SessionRow
    const key = text(row.key)
    const id = openClawConversationIdFromSessionKey(runtimeAgentId, organizationId, key)
    const updatedAt = timestamp(row.updatedAt)
    if (!id || updatedAt === null) return []

    const createdAt = timestamp(row.createdAt) ?? updatedAt
    const preview = visibleOpenClawActivityText(row.lastMessagePreview)
    const proposedTitle = visibleOpenClawActivityText(row.label)
      || visibleOpenClawActivityText(row.derivedTitle)
      || visibleOpenClawActivityText(row.displayName)
    const title = id === onboardingId ? 'Prise de poste' : shortTitle(proposedTitle || preview || 'Nouvelle conversation')

    return [{
      id,
      userId,
      agentId: frontAgentId,
      title,
      preview: preview || 'Ouvrir pour retrouver cet échange.',
      owner,
      time: relativeTime(updatedAt, now),
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
    }]
  })

  const unique = new Map<string, ConversationSummary>()
  for (const conversation of conversations.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
    if (!unique.has(conversation.id)) unique.set(conversation.id, conversation)
  }
  return [...unique.values()]
}
