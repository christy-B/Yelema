import type { Session } from '../../auth/api/contracts.ts'
import type { ConversationSummary, Message } from './contracts.ts'
import { sendHermesChat, type HermesChatMessage } from './hermes-client.ts'
import {
  listStoredHermesConversations,
  loadStoredHermesConversation,
  saveStoredHermesConversation,
  type HermesStoredConversation,
} from './hermes-history.ts'
import {
  hermesConversationId,
  hermesOnboardingConversationId,
  hermesRuntimeAgentId,
} from './hermes-routing.ts'

export interface HermesImageAttachment {
  mimeType: string
  content: string
}

export interface HermesClientContext {
  user: { id: string; name: string; jobTitle: string; language: string }
  organization: {
    id: string
    name: string
    legalName?: string | null
    sector?: string | null
    country?: string | null
  }
}

interface HermesRuntimeConfig {
  id: string
  apiBaseUrl: string
  apiKey: string
}

const CLIENT_CONTEXT_START = '<yelema_client_context>'
const CLIENT_CONTEXT_END = '</yelema_client_context>'
const INITIALIZATION_TASK_START = '<yelema_initialization_task>'
const INITIALIZATION_TASK_END = '</yelema_initialization_task>'
const initializationRuns = new Map<string, Promise<void>>()
const MAX_HISTORY_MESSAGES = 80
const MAX_HISTORY_CHARACTERS = 120_000

function runtimeConfig(frontAgentId: string): HermesRuntimeConfig {
  const id = hermesRuntimeAgentId(frontAgentId)
  if (!id) throw new Error(`L'expert ${frontAgentId} n'est pas branché à Hermes.`)
  const urls: Record<string, string | undefined> = {
    adjoua: import.meta.env.VITE_HERMES_ADJOUA_URL as string | undefined,
    djeneba: import.meta.env.VITE_HERMES_DJENEBA_URL as string | undefined,
    lokoli: import.meta.env.VITE_HERMES_LOKOLI_URL as string | undefined,
  }
  const apiBaseUrl = urls[id]?.trim()
  const apiKey = (import.meta.env.VITE_HERMES_API_KEY as string | undefined)?.trim()
  if (!apiBaseUrl) throw new Error(`L'URL locale du profil Hermes ${id} est absente.`)
  if (!apiKey) throw new Error('Le jeton Hermes local est absent de VITE_HERMES_API_KEY.')
  return { id, apiBaseUrl, apiKey }
}

function storage(): Storage {
  return window.localStorage
}

function messageWithClientContext(message: string, context?: HermesClientContext): string {
  if (!context) return message
  return [
    CLIENT_CONTEXT_START,
    "Contexte fourni par l'espace client Yelema authentifié. Utilise ces informations comme contexte de la conversation. Ne redemande pas le nom, la fonction ou l'organisation lorsqu'ils sont renseignés.",
    JSON.stringify(context),
    CLIENT_CONTEXT_END,
    message,
  ].join('\n')
}

function visibleUserMessage(message: string): string {
  const start = message.indexOf(INITIALIZATION_TASK_START)
  const end = message.indexOf(INITIALIZATION_TASK_END, start)
  if (start >= 0 && end >= 0) return ''
  return message
}

function limitedHistory(messages: HermesChatMessage[]): HermesChatMessage[] {
  const kept: HermesChatMessage[] = []
  let characters = 0
  for (const message of [...messages].reverse()) {
    const size = typeof message.content === 'string'
      ? message.content.length
      : JSON.stringify(message.content).length
    if (kept.length >= MAX_HISTORY_MESSAGES || characters + size > MAX_HISTORY_CHARACTERS) break
    kept.push(message)
    characters += size
  }
  return kept.reverse()
}

function toSummary(conversation: HermesStoredConversation): ConversationSummary {
  const last = conversation.messages.at(-1)
  return {
    id: conversation.id,
    userId: conversation.userId,
    agentId: conversation.agentId,
    title: conversation.title,
    preview: last?.text ?? conversation.title,
    owner: conversation.owner,
    time: relativeTime(conversation.updatedAt),
    status: 'done',
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  }
}

function relativeTime(value: string): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000))
  if (elapsedMinutes < 1) return "à l'instant"
  if (elapsedMinutes < 60) return `il y a ${elapsedMinutes} min`
  const hours = Math.floor(elapsedMinutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

/**
 * COPIE AUTONOME — intégration désactivée.
 *
 * Cette copie du front est faite pour tourner seule, sur les seuls mocks MSW :
 * ni passerelle Hermes, ni compte, ni jeton. Le garde-fou ci-dessous répond
 * donc toujours « non », et tous les appelants empruntent d'eux-mêmes le
 * chemin simulé — aucun d'eux n'a été modifié.
 *
 * Le reste du module est conservé tel quel pour que les types et les
 * signatures restent alignés sur le monorepo : réactiver l'intégration se
 * limite à rétablir la ligne d'origine, indiquée juste en dessous.
 */
export function isHermesExpert(frontAgentId: string): boolean {
  void frontAgentId
  // Origine : return hermesRuntimeAgentId(frontAgentId) !== null
  return false
}

export function hermesClientContextFromSession(session: Session): HermesClientContext {
  return {
    user: { id: session.user.id, name: session.user.name, jobTitle: session.user.title, language: session.user.language },
    organization: {
      id: session.workspace.id,
      name: session.workspace.name,
      legalName: session.workspace.legalName,
      sector: session.workspace.sector,
      country: session.workspace.country,
    },
  }
}

export function hermesInitialConversationId(context: HermesClientContext): string {
  return hermesOnboardingConversationId(context.organization.id)
}

export function createHermesConversationId(organizationId: string): string {
  return hermesConversationId(organizationId, crypto.randomUUID())
}

export async function listHermesConversations(frontAgentId: string, session: Session): Promise<ConversationSummary[]> {
  return listStoredHermesConversations(storage(), frontAgentId, session.workspace.id).map(toSummary)
}

export async function listHermesMessages(
  frontAgentId: string,
  conversationId: string,
  context: HermesClientContext,
): Promise<Message[]> {
  return loadStoredHermesConversation(storage(), frontAgentId, context.organization.id, conversationId)?.messages ?? []
}

export async function labelHermesConversation(
  frontAgentId: string,
  conversationId: string,
  title: string,
  context: HermesClientContext,
): Promise<void> {
  const conversation = loadStoredHermesConversation(storage(), frontAgentId, context.organization.id, conversationId)
  if (!conversation) return
  saveStoredHermesConversation(storage(), { ...conversation, title: title.slice(0, 120), updatedAt: new Date().toISOString() })
}

export function initializeHermesExpert(frontAgentId: string, context: HermesClientContext): Promise<void> {
  if (!isHermesExpert(frontAgentId)) return Promise.resolve()
  const conversationId = hermesInitialConversationId(context)
  const activeKey = `${frontAgentId}:${context.organization.id}`
  const active = initializationRuns.get(activeKey)
  if (active) return active
  const existing = loadStoredHermesConversation(storage(), frontAgentId, context.organization.id, conversationId)
  if (existing?.messages.some((message) => message.role === 'agent')) return Promise.resolve()

  const run = sendHermesMessage(
    frontAgentId,
    conversationId,
    [
      INITIALIZATION_TASK_START,
      "Première tâche autonome, exécutée avant toute intervention de l'utilisateur.",
      "Prends connaissance du contexte client authentifié puis initialise toi-même la conversation.",
      "Écris un premier message de prise de poste naturel et concis, adapté à la personne, à sa fonction et à son organisation.",
      "Ne demande ni son identité, ni sa fonction, ni le nom de son organisation lorsque ces informations sont renseignées.",
      INITIALIZATION_TASK_END,
    ].join('\n'),
    () => undefined,
    undefined,
    context,
  ).then(() => undefined).finally(() => { initializationRuns.delete(activeKey) })
  initializationRuns.set(activeKey, run)
  return run
}

export async function sendHermesMessage(
  frontAgentId: string,
  conversationId: string,
  message: string,
  onDelta: (text: string) => void,
  attachments?: HermesImageAttachment[],
  context?: HermesClientContext,
): Promise<Message> {
  const runtime = runtimeConfig(frontAgentId)
  const organizationId = context?.organization.id
  if (!organizationId) throw new Error("Le contexte de l'organisation est requis pour utiliser Hermes.")
  const now = new Date().toISOString()
  const previous = loadStoredHermesConversation(storage(), frontAgentId, organizationId, conversationId)
  const visibleText = visibleUserMessage(message)
  const outboundText = messageWithClientContext(message, context)
  const content: HermesChatMessage['content'] = attachments?.length
    ? [
        { type: 'text', text: outboundText },
        ...attachments.map((attachment) => ({
          type: 'image_url' as const,
          image_url: { url: `data:${attachment.mimeType};base64,${attachment.content}`, detail: 'high' as const },
        })),
      ]
    : outboundText
  const history: HermesChatMessage[] = (previous?.messages ?? []).map((item) => ({
    role: item.role === 'agent' ? 'assistant' : 'user',
    content: item.text,
  }))
  const text = await sendHermesChat({
    apiBaseUrl: runtime.apiBaseUrl,
    apiKey: runtime.apiKey,
    model: runtime.id,
    messages: limitedHistory([...history, { role: 'user', content }]),
    onDelta,
  })
  const userMessages: Message[] = visibleText
    ? [{ id: crypto.randomUUID(), role: 'user', text: visibleText }]
    : []
  const assistant: Message = { id: crypto.randomUUID(), role: 'agent', text }
  const title = previous?.title
    ?? (conversationId === hermesOnboardingConversationId(organizationId)
      ? 'Prise de poste'
      : (visibleText.slice(0, 72) || 'Nouvelle conversation'))
  saveStoredHermesConversation(storage(), {
    id: conversationId,
    agentId: frontAgentId,
    organizationId,
    userId: previous?.userId ?? context.user.id,
    owner: previous?.owner ?? context.user.name,
    title,
    messages: [...(previous?.messages ?? []), ...userMessages, assistant],
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  })
  return assistant
}
