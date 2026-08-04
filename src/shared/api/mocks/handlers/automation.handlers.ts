import { http, HttpResponse } from 'msw'

import type { Automation, AutomationTrigger, CreateAutomationRequest } from '../../../../features/automations/api/contracts'
import automationsFixture from '../fixtures/automations.json'
import { API_BASE, getAuthenticatedUser, notFound, requireAuth, validationError } from './helpers'
import { addLivrableRecord } from './livrable.handlers'

/**
 * Automatisations (cron / événement) qui déclenchent les employés IA — domaine
 * RUNTIME (Temporal), simulé en attendant le gateway. Privées par membre ;
 * les agents sont résolus vers les agents RÉELS par nom au premier appel.
 * « Exécuter maintenant » produit un livrable, visible dans l'onglet Livrables.
 */
interface AutomationRecord extends Omit<Automation, 'agentId' | 'nextRunAt'> {
  userId: string
  agentId?: string
}

let automations = structuredClone(automationsFixture) as AutomationRecord[]

const LEGACY_OWNER_EMAILS: Record<string, string> = {
  u_12: 'admin@banque-atlantique.ci',
  u_18: 'facturation@banque-atlantique.ci',
}

let agentsResolved = false
let agentNameById = new Map<string, string>()

async function resolveAgents(request: Request): Promise<void> {
  const authorization = request.headers.get('Authorization')
  if (!authorization) return
  try {
    const response = await fetch(`${API_BASE}/agents`, { headers: { Authorization: authorization } })
    if (!response.ok) return
    const agents = (await response.json()) as { id: string; displayName: string }[]
    if (!agents.length) return
    agentNameById = new Map(agents.map((agent) => [agent.id, agent.displayName]))
    if (!agentsResolved) {
      const idByName = new Map(agents.map((agent) => [agent.displayName, agent.id]))
      for (const automation of automations) {
        automation.agentId = idByName.get(automation.agentName) ?? automation.agentId ?? ''
      }
      agentsResolved = true
    }
  } catch {
    // API agents momentanément indisponible : on retentera au prochain appel.
  }
}

/** Prochaine occurrence d'un planning (calcul naïf, suffisant pour la simulation). */
function nextRunAt(trigger: AutomationTrigger, active: boolean): string | null {
  if (!active || trigger.kind !== 'cron') return null
  const [hours, minutes] = trigger.time.split(':').map(Number)
  const next = new Date()
  next.setHours(hours ?? 8, minutes ?? 0, 0, 0)
  if (trigger.frequency === 'daily') {
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1)
  } else if (trigger.frequency === 'weekly') {
    const daysUntilMonday = (8 - next.getDay()) % 7 || 7
    if (next.getDay() !== 1 || next.getTime() <= Date.now()) next.setDate(next.getDate() + daysUntilMonday)
  } else {
    next.setDate(1)
    if (next.getTime() <= Date.now()) next.setMonth(next.getMonth() + 1)
  }
  return next.toISOString()
}

function toAutomation(record: AutomationRecord): Automation {
  const { userId: _owner, ...automation } = record
  void _owner
  return { ...automation, agentId: record.agentId ?? '', nextRunAt: nextRunAt(record.trigger, record.active) }
}

function findOwned(id: string, user: { id: string; email: string }): AutomationRecord | undefined {
  return automations.find(
    (record) => record.id === id && (record.userId === user.id || LEGACY_OWNER_EMAILS[record.userId] === user.email),
  )
}

export const automationHandlers = [
  http.get(`${API_BASE}/automations`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized
    await resolveAgents(request)

    const result = automations
      .filter((record) => record.userId === currentUser.id || LEGACY_OWNER_EMAILS[record.userId] === currentUser.email)
      .map(toAutomation)
    return HttpResponse.json(result)
  }),

  http.post(`${API_BASE}/automations`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized
    await resolveAgents(request)

    const body = (await request.json()) as Partial<CreateAutomationRequest>
    if (!body.name?.trim() || !body.agentId || !body.instruction?.trim() || !body.trigger) {
      return validationError('Le nom, l’agent, la consigne et le déclencheur sont obligatoires.')
    }
    const record: AutomationRecord = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      name: body.name.trim(),
      agentId: body.agentId,
      agentName: agentNameById.get(body.agentId) ?? '',
      instruction: body.instruction.trim(),
      trigger: body.trigger,
      active: true,
      lastRunAt: null,
    }
    automations = [record, ...automations]
    return HttpResponse.json(toAutomation(record), { status: 201 })
  }),

  http.patch(`${API_BASE}/automations/:automationId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized

    const record = findOwned(String(params.automationId), currentUser)
    if (!record) return notFound('Automatisation introuvable.')
    const body = (await request.json()) as { active?: boolean }
    if (typeof body.active === 'boolean') record.active = body.active
    return HttpResponse.json(toAutomation(record))
  }),

  http.delete(`${API_BASE}/automations/:automationId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized

    if (!findOwned(String(params.automationId), currentUser)) return notFound('Automatisation introuvable.')
    automations = automations.filter((record) => record.id !== params.automationId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API_BASE}/automations/:automationId/run`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) return unauthorized

    const record = findOwned(String(params.automationId), currentUser)
    if (!record) return notFound('Automatisation introuvable.')

    const now = new Date()
    record.lastRunAt = now.toISOString()
    // L'exécution produit un livrable, rattaché au membre courant.
    addLivrableRecord({
      id: crypto.randomUUID(),
      userId: currentUser.id,
      title: `${record.name} — ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(now)}`,
      type: 'pdf',
      format: 'Note',
      agentName: record.agentName,
      agentId: record.agentId,
      skill: 'Automatisation',
      createdAt: record.lastRunAt,
      size: '12 Ko',
    })
    return HttpResponse.json(toAutomation(record))
  }),
]
