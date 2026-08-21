import { http, HttpResponse } from 'msw'

import type { AssignProjectExpertsRequest, CreateProjectRequest, Project } from '../../../../features/projects/api/contracts'
import { mergeProjectAssignments } from '../../../../features/projects/project-model'
import projectsFixture from '../fixtures/projects.json'
import { WORKSPACE } from './demo-store'
import { API_BASE, getAuthenticatedUser, notFound, requireAuth, validationError } from './helpers'

let projects = structuredClone(projectsFixture) as Project[]

/**
 * Lecture seule des projets, pour les routes qui en DERIVENT quelque chose —
 * les notifications, par exemple. Exposer un lecteur plutot que de tenir une
 * seconde copie : deux etats finiraient par diverger, et une decision tranchee
 * resterait affichee ailleurs.
 */
export function currentProjects(): readonly Project[] {
  return projects
}

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
      planState: 'proposed' as const,
      suggestedDeliverables: [],
      suggestedInputs: [],
      suggestedConnectors: [],
      dueDate: body.dueDate || null,
      constraints: body.constraints?.trim() || null,
      expectedDeliverables: deliverables,
      createdAt: now,
      updatedAt: now,
      orchestrator: { name: 'Chef de projet IA', displayName: 'Dany', agentId: 'orc_dany', responsibility: 'Coordonner le plan, les dépendances et les validations humaines.' },
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

  /**
   * Valider — ou retirer la validation — d'une piece du plan : une tache, un
   * expert, ou tout d'un coup. Le serveur reste l'autorite : c'est lui qui
   * decide si le plan est entierement approuve.
   */
  http.patch(`${API_BASE}/projects/:projectId/plan`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = projects.find((item) => item.id === String(params.projectId))
    if (!project) return notFound('Projet introuvable.')

    const body = (await request.json()) as {
      taskId?: string
      agentId?: string
      approved?: boolean
      approveAll?: boolean
      launch?: boolean
    }
    const approved = body.approved !== false

    if (body.approveAll) {
      for (const task of project.tasks) task.approved = approved
      for (const assignment of project.assignments) assignment.approved = approved
    }
    if (body.taskId) {
      const task = project.tasks.find((item) => item.id === body.taskId)
      if (!task) return notFound('Tâche introuvable.')
      task.approved = approved
    }
    if (body.agentId) {
      const assignment = project.assignments.find((item) => item.agentId === body.agentId)
      if (!assignment) return notFound('Expert non mobilisé sur ce projet.')
      assignment.approved = approved
    }

    // Le plan n'est « approuve » que si TOUT l'est — une tache oubliee laisse
    // le projet en proposition.
    // L'accord porte sur les taches, plus sur les personnes : la mobilisation
    // d'un expert ne se valide plus, elle se retire.
    const complet = project.tasks.every((task) => task.approved && !!task.agentId)
      && project.tasks.length > 0
      && project.assignments.length > 0

    if (body.launch) {
      if (!complet) return validationError('Chaque tâche doit être validée et confiée à un expert avant le lancement.')
      project.planState = 'running'
      project.status = 'active'
      project.activities.unshift({
        id: `act_${crypto.randomUUID().slice(0, 8)}`,
        kind: 'task_updated',
        summary: 'Plan validé — les experts commencent à travailler.',
        createdAt: new Date().toISOString(),
      })
    } else if (project.planState !== 'running') {
      project.planState = complet ? 'approved' : 'proposed'
    }

    project.updatedAt = new Date().toISOString()
    return HttpResponse.json(project)
  }),

  /** Rediger ou corriger le brief d'une tache proposee. */
  /**
   * Ajouter des documents aux ressources du projet. Les televersements ne
   * vivaient que dans l'ecran : un rechargement les perdait, et un besoin ne
   * pouvait donc pas pointer durablement une piece.
   */
  http.post(`${API_BASE}/projects/:projectId/resources`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = projects.find((item) => item.id === String(params.projectId))
    if (!project) return notFound('Projet introuvable.')
    const body = (await request.json()) as { files?: Array<{ id?: string; name?: string; format?: string }> }
    const entrants = Array.isArray(body.files) ? body.files : []
    const now = new Date().toISOString()
    const ajoutes: typeof project.resources = []
    for (const fichier of entrants) {
      const name = fichier.name?.trim()
      if (!name) continue
      ajoutes.push({
        id: fichier.id || crypto.randomUUID(),
        kind: 'input',
        name,
        format: fichier.format?.trim() || (name.includes('.') ? name.split('.').pop()!.toLocaleUpperCase('fr') : 'FICHIER'),
        createdAt: now,
      })
    }
    if (ajoutes.length === 0) return validationError('Aucun document valide à ajouter.')
    project.resources = [...ajoutes, ...project.resources]
    project.updatedAt = now
    return HttpResponse.json(project, { status: 201 })
  }),

  /**
   * Trancher une suggestion de livrable : acceptee, elle rejoint les attendus ;
   * ecartee, elle disparait. Dans les deux cas elle quitte les suggestions —
   * une decision prise ne se represente pas.
   */
  http.patch(`${API_BASE}/projects/:projectId/deliverables/:suggestionId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = projects.find((item) => item.id === String(params.projectId))
    if (!project) return notFound('Projet introuvable.')
    const suggestionId = String(params.suggestionId)
    const suggestion = project.suggestedDeliverables.find((item) => item.id === suggestionId)
    if (!suggestion) return notFound('Suggestion introuvable.')
    const body = (await request.json()) as { accept?: boolean }
    if (body.accept && !project.expectedDeliverables.includes(suggestion.label)) {
      project.expectedDeliverables = [...project.expectedDeliverables, suggestion.label]
    }
    project.suggestedDeliverables = project.suggestedDeliverables.filter((item) => item.id !== suggestionId)
    project.updatedAt = new Date().toISOString()
    return HttpResponse.json(project)
  }),

  /**
   * Retirer un expert du projet. Ses taches partent avec lui : personne ne
   * reste pour les faire, et une tache orpheline bloquerait le lancement sans
   * qu'on sache pourquoi. L'ecran previent avant d'appeler cette route.
   */
  http.delete(`${API_BASE}/projects/:projectId/assignments/:agentId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = projects.find((item) => item.id === String(params.projectId))
    if (!project) return notFound('Projet introuvable.')
    if (project.planState === 'running') return validationError('Le projet est lancé : l’équipe ne peut plus être modifiée ici.')
    const agentId = String(params.agentId)
    if (!project.assignments.some((item) => item.agentId === agentId)) return notFound('Expert non mobilisé sur ce projet.')
    project.assignments = project.assignments.filter((item) => item.agentId !== agentId)
    project.tasks = project.tasks.filter((task) => task.agentId !== agentId)
    project.updatedAt = new Date().toISOString()
    return HttpResponse.json(project)
  }),

  /**
   * Ajouter une tache au plan propose. L'utilisateur complete ce que le chef
   * de projet n'a pas vu ; une fois le projet lance, le plan est fige.
   */
  http.post(`${API_BASE}/projects/:projectId/tasks`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = projects.find((item) => item.id === String(params.projectId))
    if (!project) return notFound('Projet introuvable.')
    if (project.planState === 'running') return validationError('Le plan est figé : le projet est lancé.')
    const body = (await request.json()) as { title?: string; agentId?: string }
    const title = body.title?.trim()
    if (!title) return validationError('Le titre de la tâche est obligatoire.')
    // Une tache sans expert n'a personne pour la faire, et le lancement
    // l'exige de toute facon : on ne la cree pas a moitie.
    const agentId = body.agentId?.trim()
    if (!agentId) return validationError('Confiez la tâche à un expert.')
    project.tasks = [...project.tasks, { id: crypto.randomUUID(), title, status: 'todo', agentId, approved: false }]
    project.updatedAt = new Date().toISOString()
    return HttpResponse.json(project, { status: 201 })
  }),

  /** Retirer une tache du plan propose, tant que le projet n'a pas demarre. */
  http.delete(`${API_BASE}/projects/:projectId/tasks/:taskId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = projects.find((item) => item.id === String(params.projectId))
    if (!project) return notFound('Projet introuvable.')
    if (project.planState === 'running') return validationError('Le plan est figé : le projet est lancé.')
    const taskId = String(params.taskId)
    if (!project.tasks.some((item) => item.id === taskId)) return notFound('Tâche introuvable.')
    project.tasks = project.tasks.filter((item) => item.id !== taskId)
    project.updatedAt = new Date().toISOString()
    return HttpResponse.json(project)
  }),

  http.patch(`${API_BASE}/projects/:projectId/tasks/:taskId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const project = projects.find((item) => item.id === String(params.projectId))
    if (!project) return notFound('Projet introuvable.')
    if (project.planState === 'running') return validationError('Le plan est figé : le projet est lancé.')
    const task = project.tasks.find((item) => item.id === String(params.taskId))
    if (!task) return notFound('Tâche introuvable.')
    const body = (await request.json()) as { title?: string; brief?: string; agentId?: string | null }
    if (typeof body.title === 'string') {
      if (!body.title.trim()) return validationError('Le titre de la tâche est obligatoire.')
      task.title = body.title.trim()
    }
    if (typeof body.brief === 'string') task.brief = body.brief.slice(0, 1000)
    if (body.agentId !== undefined) {
      // Reaffecter, oui ; laisser la tache sans personne, non.
      if (!body.agentId) return validationError('Une tâche doit rester confiée à un expert.')
      task.agentId = body.agentId
    }
    project.updatedAt = new Date().toISOString()
    return HttpResponse.json(project)
  }),
]