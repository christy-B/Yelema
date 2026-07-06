import { http, HttpResponse } from 'msw'

import type {
  ConversationSummary,
  CreateConversationRequest,
  Message,
} from '../../conversation/contracts'
import conversationsFixture from '../fixtures/conversations.json'
import messagesFixture from '../fixtures/messages.json'
import { API_BASE, forbidden, getAuthenticatedUserId, notFound, requireAuth, validationError } from './helpers'
import { excludedAgentIdsFor } from './member-store'

let conversations = structuredClone(conversationsFixture) as ConversationSummary[]
const messages = structuredClone(messagesFixture) as Record<string, Message[]>

function findConversation(id: string): ConversationSummary | undefined {
  return conversations.find((conversation) => conversation.id === id)
}

export const conversationHandlers = [
  http.get(`${API_BASE}/conversations`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const currentUserId = getAuthenticatedUserId(request)
    const searchParams = new URL(request.url).searchParams
    const agentId = searchParams.get('agent')
    const query = searchParams.get('q')?.trim().toLocaleLowerCase('fr')

    // Conversations privées : chaque membre ne voit que les siennes.
    const result = conversations.filter((conversation) => {
      if (conversation.userId !== currentUserId) return false
      const matchesAgent = !agentId || agentId === 'all' || conversation.agentId === agentId
      const searchable = `${conversation.title} ${conversation.preview}`.toLocaleLowerCase('fr')
      const matchesQuery = !query || searchable.includes(query)
      return matchesAgent && matchesQuery
    })

    return HttpResponse.json(result)
  }),

  http.post(`${API_BASE}/conversations`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const body = (await request.json()) as Partial<CreateConversationRequest>
    if (!body.agentId || !body.intake) {
      return validationError('L’agent et le formulaire de cadrage sont obligatoires.')
    }

    const now = new Date().toISOString()
    const currentUserId = getAuthenticatedUserId(request)
    if (!currentUserId) return unauthorized
    if (excludedAgentIdsFor(currentUserId).includes(body.agentId)) {
      return forbidden('Vous n’avez pas accès à cet agent.')
    }
    const conversation: ConversationSummary = {
      id: crypto.randomUUID(),
      userId: currentUserId,
      agentId: body.agentId,
      title: 'Nouvelle conversation',
      preview: body.intake.precisions ?? '',
      owner: 'Aïcha Koné',
      time: "à l'instant",
      createdAt: now,
      updatedAt: now,
    }
    conversations = [conversation, ...conversations]
    messages[conversation.id] = []
    return HttpResponse.json(conversation, { status: 201 })
  }),

  http.get(`${API_BASE}/conversations/:conversationId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    const conversation = findConversation(id)
    return conversation
      ? HttpResponse.json({ ...conversation, messages: messages[id] ?? [] })
      : notFound('Conversation introuvable.')
  }),

  http.patch(`${API_BASE}/conversations/:conversationId`, async ({ request, params }) => {
    const unauthorized = requireAuth(request)
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

  http.delete(`${API_BASE}/conversations/:conversationId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    if (!findConversation(id)) return notFound('Conversation introuvable.')
    conversations = conversations.filter((conversation) => conversation.id !== id)
    delete messages[id]
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/conversations/:conversationId/messages`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    return findConversation(id)
      ? HttpResponse.json(messages[id] ?? [])
      : notFound('Conversation introuvable.')
  }),

  http.post(`${API_BASE}/conversations/:conversationId/messages`, async ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    const conversation = findConversation(id)
    if (!conversation) return notFound('Conversation introuvable.')
    if (excludedAgentIdsFor(getAuthenticatedUserId(request)).includes(conversation.agentId)) {
      return forbidden('Vous n’avez pas accès à cet agent.')
    }
    const body = (await request.json()) as { text?: string }
    if (!body.text?.trim()) return validationError('Le message est obligatoire.')

    const response: Message = {
      id: crypto.randomUUID(),
      role: 'agent',
      text: 'Voici une réponse simulée fondée sur les documents disponibles.',
      sources: ['Rapport_Q1.pdf · p. 7'],
    }
    messages[id] = [...(messages[id] ?? []), response]
    return HttpResponse.json(response, { status: 201 })
  }),

  http.post(`${API_BASE}/conversations/:conversationId/context`, async ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const id = String(params.conversationId)
    if (!findConversation(id)) return notFound('Conversation introuvable.')
    const body = (await request.json()) as { fileId?: string }
    if (!body.fileId) return validationError('Le fichier est obligatoire.')
    return HttpResponse.json({ conversationId: id, fileId: body.fileId }, { status: 201 })
  }),
]
