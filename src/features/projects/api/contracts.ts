export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed'

/**
 * Où en est le plan proposé par le chef de projet.
 *
 * `proposed` — il a analysé le besoin et suggère tâches, experts et
 * connecteurs ; rien n'est engagé.
 * `approved` — tout est validé, le projet attend le feu vert.
 * `running`  — les experts travaillent.
 */
export type ProjectPlanState = 'proposed' | 'approved' | 'running'
export type ProjectTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type ProjectActivityKind = 'project_created' | 'plan_proposed' | 'assignment_added' | 'task_updated' | 'decision_required' | 'artifact_added'
export type ProjectResourceKind = 'input' | 'artifact'

/**
 * Ce que le chef de projet reclame avant de lancer le travail : un document,
 * un export, un acces. Il ne peut pas le fournir lui-meme — il dit de quoi les
 * experts ont besoin et pourquoi, l'utilisateur decide.
 */
export interface ProjectNeed {
  id: string
  label: string
  /** Pourquoi ce document change le resultat : sans le motif, c'est une corvee. */
  reason: string
}

/**
 * Un connecteur que le chef de projet juge utile a CE projet. Le nom renvoie
 * au catalogue ; le motif dit ce que l'acces change pour le travail.
 */
export interface ProjectConnectorSuggestion {
  name: string
  reason: string
}

/**
 * Un livrable que le chef de projet propose d'ajouter aux attendus. Il lit la
 * fiche de mission et voit ce qui manquera au resultat ; l'utilisateur reste
 * seul juge de ce que le projet doit produire.
 */
export interface ProjectDeliverableSuggestion {
  id: string
  label: string
  /** Pourquoi ce livrable change l'issue du projet. */
  reason: string
}

/** Un message echange avec le chef de projet. */
export interface ProjectMessage {
  id: string
  author: 'user' | 'orchestrator'
  body: string
  createdAt: string
}

export interface ProjectTask {
  id: string
  title: string
  status: ProjectTaskStatus
  agentId?: string | null
  /** Ce que l'expert doit produire pour cette tâche. Modifiable. */
  brief?: string
  /** Validée par l'utilisateur. Une tâche non validée n'est pas lancée. */
  approved?: boolean
}

export interface ProjectAssignment {
  agentId: string
  responsibility: string
  assignedAt: string
  /** Expert validé par l'utilisateur. Le chef de projet le propose, il ne l'impose pas. */
  approved?: boolean
}

export interface ProjectActivity {
  id: string
  kind: ProjectActivityKind
  summary: string
  createdAt: string
  agentId?: string | null
  taskId?: string | null
  conversationId?: string | null
  resourceId?: string | null
}

export interface ProjectResource {
  id: string
  kind: ProjectResourceKind
  name: string
  format: string
  createdAt: string
  agentId?: string | null
}

export interface ProjectDecision {
  id: string
  title: string
  requestedAt: string
  agentId?: string | null
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  objective: string
  status: ProjectStatus
  dueDate: string | null
  constraints: string | null
  expectedDeliverables: string[]
  createdAt: string
  updatedAt: string
  orchestrator: {
    /** Sa fonction, affichee comme intitule de sa ligne dans l'equipe. */
    name: 'Chef de projet IA'
    /** Son prenom : c'est lui qu'on clique pour lui parler. */
    displayName: string
    /** Identifiant de sa fiche d'expert, pour ouvrir son espace. */
    agentId: string
    responsibility: string
  }
  /** Où en est le plan proposé par le chef de projet. */
  planState: ProjectPlanState
  /**
   * Connecteurs que le chef de projet juge nécessaires. Suggestions : c'est
   * l'utilisateur qui les branche, depuis l'onglet Intégrations.
   */
  /** Livrables que le chef de projet propose en plus des attendus. */
  suggestedDeliverables: ProjectDeliverableSuggestion[]
  /** Documents et exports que le chef de projet juge utiles au travail. */
  suggestedInputs: ProjectNeed[]
  suggestedConnectors: ProjectConnectorSuggestion[]
  tasks: ProjectTask[]
  assignments: ProjectAssignment[]
  decisions: ProjectDecision[]
  activities: ProjectActivity[]
  resources: ProjectResource[]
}

export interface CreateProjectRequest {
  workspaceId: string
  name: string
  objective: string
  expectedDeliverables: string[]
  dueDate: string | null
  constraints: string | null
  resourceNames: string[]
}

export interface AssignProjectExpertsRequest {
  assignments: Array<Pick<ProjectAssignment, 'agentId' | 'responsibility'>>
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'À cadrer',
  active: 'En cours',
  paused: 'En pause',
  completed: 'Terminé',
}

export const PROJECT_TASK_STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  blocked: 'Bloqué',
  done: 'Terminé',
}
