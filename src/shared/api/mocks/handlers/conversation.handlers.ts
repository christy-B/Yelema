import { http, HttpResponse } from 'msw'

import type {
  ConversationSummary,
  CreateConversationRequest,
  Message,
} from '../../../../features/conversations/api/contracts'
import { ROSTER } from '../../../../features/agents/roster'
import { simulateReply } from '../conversation-sim'
import { openingMessage, openingPreview } from '../prise-de-poste'
import { drainOpenings } from '../stores/recruitment.store'
import conversationsFixture from '../fixtures/conversations.json'
import messagesFixture from '../fixtures/messages.json'
import { API_BASE, getAuthenticatedUser, notFound, requireAuth, validationError } from './helpers'

let conversations = structuredClone(conversationsFixture) as ConversationSummary[]
const messages = structuredClone(messagesFixture) as Record<string, Message[]>

// Les conversations de démo étaient rattachées aux anciens ids mockés (u_XX).
// Avec l'auth réelle, on les rattache aux comptes tenant du seed par email ;
// les autres comptes (ops@, lecture@) démarrent sans conversation → onboarding.
const LEGACY_OWNER_EMAILS: Record<string, string> = {
  u_12: 'admin@banque-atlantique.ci',
  u_18: 'facturation@banque-atlantique.ci',
}

function belongsTo(conversation: ConversationSummary, user: { id: string; email: string }): boolean {
  return (
    conversation.userId === user.id ||
    LEGACY_OWNER_EMAILS[conversation.userId] === user.email
  )
}

function findConversation(id: string): ConversationSummary | undefined {
  return conversations.find((conversation) => conversation.id === id)
}

/**
 * Les conversations de démonstration sont recalées sur « maintenant » au premier
 * chargement : l'écart entre elles, tel qu'écrit dans la fixture, est conservé,
 * et la plus récente se retrouve à quelques heures. La frise d'activité reste
 * donc crédible quelle que soit la date de consultation. Fixture uniquement —
 * le back réel datera ses propres enregistrements.
 */
let datesRebased = false

function relativeLabel(from: number, now: number): string {
  const minutes = Math.round((now - from) / 60_000)
  if (minutes < 2) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  return `${Math.round(days / 7)} sem.`
}

function rebaseDemoDates(): void {
  if (datesRebased) return
  const now = Date.now()
  const newest = Math.max(...conversations.map((conversation) => Date.parse(conversation.createdAt)))
  if (!Number.isFinite(newest)) { datesRebased = true; return }
  // La plus récente atterrit à 3 h d'ici ; toutes les autres suivent du même décalage.
  const delta = now - 3 * 3_600_000 - newest
  for (const conversation of conversations) {
    const at = Date.parse(conversation.createdAt) + delta
    conversation.createdAt = new Date(at).toISOString()
    conversation.updatedAt = conversation.createdAt
    conversation.time = relativeLabel(at, now)
  }
  datesRebased = true
}

/**
 * Matérialise les prises de poste des experts recrutés depuis la dernière
 * lecture : l'expert a engagé la conversation, elle existe donc avant que
 * l'utilisateur ait écrit quoi que ce soit.
 */
function materialiseOpenings(user: { id: string; email: string }): void {
  for (const agentId of drainOpenings()) {
    const expert = ROSTER.find((item) => item.id === agentId)
    if (!expert) continue
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    conversations = [{
      id,
      userId: user.id,
      agentId,
      title: 'Prise de poste',
      preview: openingPreview(expert),
      owner: user.email,
      // L'expert attend votre réponse : la tâche est ouverte, pas terminée.
      status: 'running',
      onboardingOnly: true,
      time: "à l'instant",
      createdAt: now,
      updatedAt: now,
    }, ...conversations]
    messages[id] = [{ id: crypto.randomUUID(), role: 'agent', text: openingMessage(expert) }]
  }
}

export const conversationHandlers = [
  http.get(`${API_BASE}/conversations`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized
    rebaseDemoDates()
    materialiseOpenings(currentUser)
    const searchParams = new URL(request.url).searchParams
    const agentId = searchParams.get('agent')
    const query = searchParams.get('q')?.trim().toLocaleLowerCase('fr')

    // Conversations privées : chaque membre ne voit que les siennes.
    const result = conversations.filter((conversation) => {
      if (!belongsTo(conversation, currentUser)) return false
      const matchesAgent = !agentId || agentId === 'all' || conversation.agentId === agentId
      const searchable = `${conversation.title} ${conversation.preview}`.toLocaleLowerCase('fr')
      const matchesQuery = !query || searchable.includes(query)
      return matchesAgent && matchesQuery
    })

    return HttpResponse.json(result)
  }),

  http.post(`${API_BASE}/conversations`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const body = (await request.json()) as Partial<CreateConversationRequest>
    if (!body.agentId || !body.intake) {
      return validationError('L’agent et le formulaire de cadrage sont obligatoires.')
    }

    const now = new Date().toISOString()
    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized
    const conversation: ConversationSummary = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      agentId: body.agentId,
      title: body.intake.skill ?? (body.intake.message ? body.intake.message.slice(0, 48) : 'Nouvelle conversation'),
      preview: body.intake.message ?? '',
      owner: currentUser.email,
      status: 'running',
      time: "à l'instant",
      createdAt: now,
      updatedAt: now,
    }
    conversations = [conversation, ...conversations]
    messages[conversation.id] = []
    return HttpResponse.json(conversation, { status: 201 })
  }),

  http.get(`${API_BASE}/conversations/:conversationId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    const conversation = findConversation(id)
    return conversation
      ? HttpResponse.json({ ...conversation, messages: messages[id] ?? [] })
      : notFound('Conversation introuvable.')
  }),

  http.patch(`${API_BASE}/conversations/:conversationId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    const body = (await request.json()) as { title?: string }
    const conversation = findConversation(id)
    if (!conversation) return notFound('Conversation introuvable.')
    if (!body.title?.trim()) return validationError('Le titre est obligatoire.')

    conversation.title = body.title.trim()
    conversation.updatedAt = new Date().toISOString()
    return HttpResponse.json(conversation)
  }),

  http.delete(`${API_BASE}/conversations/:conversationId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    if (!findConversation(id)) return notFound('Conversation introuvable.')
    conversations = conversations.filter((conversation) => conversation.id !== id)
    delete messages[id]
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/conversations/:conversationId/messages`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    return findConversation(id)
      ? HttpResponse.json(messages[id] ?? [])
      : notFound('Conversation introuvable.')
  }),

  http.post(`${API_BASE}/conversations/:conversationId/messages`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    const conversation = findConversation(id)
    if (!conversation) return notFound('Conversation introuvable.')
    const body = (await request.json()) as { text?: string }
    if (!body.text?.trim()) return validationError('Le message est obligatoire.')

    // Simulation d'échange (mock) : l'expert accuse réception, propose sa méthode,
    // pose la bonne question, puis produit un résultat — adapté à son métier.
    const priorAgentCount = (messages[id] ?? []).length
    const expert = ROSTER.find((item) => item.id === conversation.agentId)
    const response: Message = {
      id: crypto.randomUUID(),
      role: 'agent',
      text: expert
        ? simulateReply(expert, body.text.trim(), priorAgentCount)
        : "C'est noté, je m'en occupe et je reviens vers vous.",
    }
    messages[id] = [...(messages[id] ?? []), response]
    return HttpResponse.json(response, { status: 201 })
  }),

  http.post(`${API_BASE}/conversations/:conversationId/context`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    if (!findConversation(id)) return notFound('Conversation introuvable.')
    const body = (await request.json()) as { fileId?: string }
    if (!body.fileId) return validationError('Le fichier est obligatoire.')
    return HttpResponse.json({ conversationId: id, fileId: body.fileId }, { status: 201 })
  }),
]

/**
 * Brief d'activité d'un expert, tel que la carte de l'équipe l'affiche : ce
 * qu'il a en cours, ce qui attend, et depuis quand il n'a rien fait.
 *
 * Vit ici parce que c'est ce module qui détient les conversations. Le back
 * réel calculera ce résumé côté serveur — l'écran ne doit pas avoir à charger
 * toutes les tâches de tous les experts pour en compter quatre.
 */
export function agentActivityBrief(agentId: string, user: { id: string; email: string }) {
  rebaseDemoDates()
  const mine = conversations
    .filter((item) => item.agentId === agentId && belongsTo(item, user))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  const count = (status: string) => mine.filter((item) => (item.status ?? 'done') === status).length
  return {
    total: mine.length,
    running: count('running'),
    paused: count('paused'),
    failed: count('failed'),
    // Trois suffisent : aucun ecran n'en montre davantage sur une carte.
    recent: mine.slice(0, 3).map((item) => ({ title: item.title, time: item.time ?? null, status: item.status ?? 'done' })),
  }
}
