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
