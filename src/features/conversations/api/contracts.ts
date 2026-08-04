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
  /** Temps de travail de l'expert sur cette tâche, en minutes (absent = non mesuré). */
  workedMinutes?: number
  createdAt: string
  updatedAt: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: Message[]
}

export interface IntakePayload {
  /** Compétence de l'expert choisie comme point de départ (label), si l'utilisateur en a cliqué une. */
  skill?: string
  /** Formulation initiale de la demande (message d'ouverture). */
  message: string
}

export interface CreateConversationRequest {
  agentId: string
  intake: IntakePayload
}
