import { apiRequest } from '../client/http-client'
import type {
  ConversationDetail,
  ConversationSummary,
  CreateConversationRequest,
  Message,
} from './contracts'

export function listConversations(params: { agent?: string; member?: string; q?: string } = {}): Promise<ConversationSummary[]> {
  const search = new URLSearchParams()
  if (params.agent) search.set('agent', params.agent)
  if (params.member) search.set('member', params.member)
  if (params.q) search.set('q', params.q)
  const query = search.toString()
  return apiRequest(`/conversations${query ? `?${query}` : ''}`)
}

export function createConversation(payload: CreateConversationRequest): Promise<ConversationSummary> {
  return apiRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getConversation(conversationId: string): Promise<ConversationDetail> {
  return apiRequest(`/conversations/${conversationId}`)
}

export function renameConversation(conversationId: string, title: string): Promise<ConversationSummary> {
  return apiRequest(`/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

export function deleteConversation(conversationId: string): Promise<void> {
  return apiRequest(`/conversations/${conversationId}`, { method: 'DELETE' })
}

export function listMessages(conversationId: string): Promise<Message[]> {
  return apiRequest(`/conversations/${conversationId}/messages`)
}

export function sendMessage(conversationId: string, text: string): Promise<Message> {
  return apiRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export function attachFileToConversation(conversationId: string, fileId: string): Promise<{ conversationId: string; fileId: string }> {
  return apiRequest(`/conversations/${conversationId}/context`, {
    method: 'POST',
    body: JSON.stringify({ fileId }),
  })
}
