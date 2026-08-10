import { http, HttpResponse } from 'msw'

import type { AssignProjectExpertsRequest, CreateProjectRequest, Project } from '../../../../features/projects/api/contracts'
import { mergeProjectAssignments } from '../../../../features/projects/project-model'
import projectsFixture from '../fixtures/projects.json'
import { WORKSPACE } from './demo-store'
import { API_BASE, getAuthenticatedUser, notFound, requireAuth, validationError } from './helpers'

let projects = structuredClone(projectsFixture) as Project[]

function requestedWorkspace(request: Request): string | null {
  return new URL(request.url).searchParams.get('workspaceId')
}

function findProject(projectId: string, workspaceId: string | null): Project | undefined {
  if (workspaceId !== WORKSPACE.id) return undefined
  return projects.find((project) => project.id === projectId && project.workspaceId === workspaceId)
}

async function recruitedAgents(request: Request): Promise<Map<string, string>> {
  const authorization = request.headers.get('Authorization')
  if (!authorization) return new Map()
  const response = await fetch(`${API_BASE}/agents`, { headers: { Authorization: authorization } })
  if (!response.ok) return new Map()
  const agents = (await response.json()) as Array<{ id: string; displayName: string }>
  return new Map(agents.map((agent) => [agent.id, agent.displayName]))
}

export const projectHandlers = [
  http.get(`${API_BASE}/projects`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const workspaceId = requestedWorkspace(request)
    if (workspaceId !== WORKSPACE.id) return HttpResponse.json([])
    return HttpResponse.json(
      projects
        .filter((project) => project.workspaceId === workspaceId)
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    )
  }),

  http.post(`${API_BASE}/projects`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized
    const body = (await request.json()) as Partial<CreateProjectRequest>
    if (body.workspaceId !== WORKSPACE.id) return validationError('Espace de travail invalide.')
    if (!body.name?.trim() || !body.objective?.trim()) return validationError('Le nom et l’objectif du projet sont obligatoires.')

    const now = new Date().toISOString()
    const deliverables = Array.isArray(body.expectedDeliverables) ? body.expectedDeliverables.map((item) => item.trim()).filter(Boolean) : []
    const resourceNames = Array.isArray(body.resourceNames) ? body.resourceNames.map((item) => item.trim()).filter(Boolean) : []
    const project: Project = {
      id: crypto.randomUUID(),
      workspaceId: body.workspaceId,
      name: body.name.trim(),
      objective: body.objective.trim(),
      status: 'draft',
      dueDate: body.dueDate || null,
      constraints: body.constraints?.trim() || null,
      expectedDeliverables: deliverables,
      createdAt: now,
      updatedAt: now,
      orchestrator: { name: 'Chef de projet IA', responsibility: 'Coordonner le plan, les dépendances et les validations humaines.' },
      tasks: (deliverables.length ? deliverables : ['Cadrer le plan de travail']).map((title) => ({ id: crypto.randomUUID(), title, status: 'todo', agentId: null })),
      assignments: [],
      decisions: [],
      activities: [{ id: crypto.randomUUID(), kind: 'project_created', summary: 'Le projet a été créé.', createdAt: now }],
      resources: resourceNames.map((name) => ({ id: crypto.randomUUID(), kind: 'input', name, format: name.includes('.') ? name.split('.').pop()!.toLocaleUpperCase('fr') : 'FICHIER', createdAt: now })),
    }
    projects = [project, ...projects]
    return HttpResponse.json(project, { status: 201 })
  }),

  http.get(`${API_BASE}/projects/:projectId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = findProject(String(params.projectId), requestedWorkspace(request))
    return project ? HttpResponse.json(project) : notFound('Projet introuvable.')
  }),

  http.post(`${API_BASE}/projects/:projectId/assignments`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = findProject(String(params.projectId), requestedWorkspace(request))
    if (!project) return notFound('Projet introuvable.')
    const body = (await request.json()) as Partial<AssignProjectExpertsRequest>
    const incoming = Array.isArray(body.assignments)
      ? body.assignments.filter((assignment) => assignment?.agentId && assignment.responsibility?.trim()).map((assignment) => ({ agentId: assignment.agentId, responsibility: assignment.responsibility.trim() }))
      : []
    if (incoming.length === 0) return validationError('Choisissez au moins un expert et précisez sa responsabilité.')

    const attached = new Set(project.assignments.map((assignment) => assignment.agentId))
    if (incoming.some((assignment) => attached.has(assignment.agentId))) {
      return validationError('Un expert déjà attaché au projet ne peut pas être ajouté comme renfort.')
    }

    const available = await recruitedAgents(request)
    if (incoming.some((assignment) => !available.has(assignment.agentId))) {
      return validationError('Seuls les experts déjà recrutés peuvent rejoindre le projet.')
    }

    const now = new Date().toISOString()
    const isReinforcement = project.assignments.length > 0
    project.assignments = mergeProjectAssignments(project.assignments, incoming, now)
    project.status = 'active'
    project.updatedAt = now
    const names = incoming.map((assignment) => available.get(assignment.agentId)).filter(Boolean).join(', ')
    project.activities.push({
      id: crypto.randomUUID(),
      kind: 'assignment_added',
      summary: isReinforcement
        ? `${names} ${incoming.length > 1 ? 'ont rejoint' : 'a rejoint'} le projet en renfort.`
        : `L’équipe du projet a été constituée avec ${names}.`,
      createdAt: now,
    })
    return HttpResponse.json(project)
  }),
]
