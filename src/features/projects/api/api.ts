import { apiRequest } from '../../../shared/api/client/http-client'
import type { AssignProjectExpertsRequest, CreateProjectRequest, Project } from './contracts'

const workspaceQuery = (workspaceId: string) => `workspaceId=${encodeURIComponent(workspaceId)}`

export function listProjects(workspaceId: string): Promise<Project[]> {
  return apiRequest(`/projects?${workspaceQuery(workspaceId)}`)
}

export function getProject(projectId: string, workspaceId: string): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}?${workspaceQuery(workspaceId)}`)
}

export function createProject(payload: CreateProjectRequest): Promise<Project> {
  return apiRequest('/projects', { method: 'POST', body: JSON.stringify(payload) })
}

export function assignProjectExperts(projectId: string, workspaceId: string, payload: AssignProjectExpertsRequest): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/assignments?${workspaceQuery(workspaceId)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Valider une pièce du plan proposé par le chef de projet — une tâche, un
 * expert — ou tout d'un bloc. `launch` donne le feu vert final : le serveur le
 * refuse tant que tout n'est pas validé.
 */
export interface PlanReviewRequest {
  taskId?: string
  agentId?: string
  approved?: boolean
  approveAll?: boolean
  launch?: boolean
}

export function reviewProjectPlan(projectId: string, payload: PlanReviewRequest): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/plan`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/** Corriger une tâche proposée : son intitulé, son brief, son expert. */
export function updateProjectTask(
  projectId: string,
  taskId: string,
  payload: { title?: string; brief?: string; agentId?: string | null },
): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/** Completer le plan propose : une tache que le chef de projet n'a pas vue. */
export function addProjectTask(projectId: string, payload: { title: string; agentId: string }): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Retirer du plan une tache jugee inutile, avant le lancement. */
export function removeProjectTask(projectId: string, taskId: string): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  })
}

/** Retirer du projet un expert propose : l'autre issue de la validation. */
export function removeProjectAssignment(projectId: string, agentId: string): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/assignments/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  })
}


/** Accepter ou ecarter un livrable propose par le chef de projet. */
export function reviewDeliverableSuggestion(projectId: string, suggestionId: string, accept: boolean): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/deliverables/${encodeURIComponent(suggestionId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ accept }),
  })
}

/** Verser des documents dans les ressources du projet. */
export function addProjectResources(
  projectId: string,
  files: Array<{ id: string; name: string; format: string }>,
): Promise<Project> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/resources`, {
    method: 'POST',
    body: JSON.stringify({ files }),
  })
}
