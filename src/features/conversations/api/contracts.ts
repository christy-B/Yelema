export type MessageRole = 'user' | 'agent'

export interface Message {
  id: string
  role: MessageRole
  text: string
  sources?: string[]
}

/** Les quatre états possibles d'une tâche confiée à un expert. */
export type ConversationStatus = 'running' | 'paused' | 'done' | 'failed'

/** Libellés et ordre d'affichage — l'en cours d'abord, l'échec en dernier. */
export const CONVERSATION_STATUSES: { key: ConversationStatus; label: string; plural: string }[] = [
  { key: 'running', label: 'En cours', plural: 'En cours' },
  { key: 'paused', label: 'En pause', plural: 'En pause' },
  { key: 'done', label: 'Terminée', plural: 'Terminées' },
  { key: 'failed', label: 'Échouée', plural: 'Échouées' },
]

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
  /**
   * État de la tâche — c'est ce que l'accueil de l'expert affiche.
   *
   * `running` : l'expert y travaille en ce moment · `paused` : suspendue, en
   * attente de vous ou d'une ressource · `done` : livrée · `failed` : n'a pas
   * abouti. Absent ⇒ traité comme `done` (tâches héritées, sans état).
   *
   * CONTRAT ATTENDU DU BACK : c'est le runtime qui détient cet état, l'espace
   * client ne fait que le lire. Pour le test local, les experts Hermes conservent
   * cet état dans le stockage du navigateur ; pour les autres, il est simulé.
   */
  status?: ConversationStatus
  /** Vrai tant que la prise de poste ne contient encore aucune réponse utilisateur. */
  onboardingOnly?: boolean
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
