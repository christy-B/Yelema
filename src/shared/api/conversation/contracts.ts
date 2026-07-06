export type MessageRole = 'user' | 'agent'

export interface Message {
  id: string
  role: MessageRole
  text: string
  sources?: string[]
}

export interface ConversationSummary {
  id: string
  userId: string
  agentId: string
  title: string
  preview: string
  /** Nom du propriétaire (affiché « Par … »). */
  owner: string
  /** Temps relatif formaté, ex. « il y a 2 h ». */
  time: string
  createdAt: string
  updatedAt: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: Message[]
}

export interface IntakePayload {
  deliverable: 'note' | 'table' | 'actions'
  points: string[]
  detail: 'court' | 'standard' | 'detaille'
  precisions?: string
}

export interface CreateConversationRequest {
  agentId: string
  intake: IntakePayload
}
