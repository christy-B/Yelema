export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed'
export type ProjectTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type ProjectActivityKind = 'project_created' | 'assignment_added' | 'task_updated' | 'decision_required' | 'artifact_added'
export type ProjectResourceKind = 'input' | 'artifact'

export interface ProjectTask {
  id: string
  title: string
  status: ProjectTaskStatus
  agentId?: string | null
}

export interface ProjectAssignment {
  agentId: string
  responsibility: string
  assignedAt: string
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
    name: 'Chef de projet IA'
    responsibility: string
  }
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
