/**
 * Une automatisation déclenche un employé IA sans intervention manuelle :
 * soit sur un planning (cron), soit sur un événement de l'espace de travail.
 * Chaque exécution produit un livrable (visible dans l'onglet Livrables).
 * Domaine runtime (Temporal) — simulé par MSW en attendant le gateway.
 */
export type AutomationFrequency = 'daily' | 'weekly' | 'monthly'

export type AutomationEvent = 'fichier-importe' | 'facture-emise'

export type AutomationTrigger =
  | { kind: 'cron'; frequency: AutomationFrequency; time: string }
  | { kind: 'event'; event: AutomationEvent }

export interface Automation {
  id: string
  name: string
  agentId: string
  agentName: string
  /** Consigne donnée à l'employé IA à chaque déclenchement. */
  instruction: string
  trigger: AutomationTrigger
  active: boolean
  lastRunAt: string | null
  /** Prochaine exécution planifiée (null pour un déclencheur événement ou en pause). */
  nextRunAt: string | null
}

export interface CreateAutomationRequest {
  name: string
  agentId: string
  instruction: string
  trigger: AutomationTrigger
}

export const FREQUENCY_LABELS: Record<AutomationFrequency, string> = {
  daily: 'Quotidien',
  weekly: 'Chaque lundi',
  monthly: 'Le 1er du mois',
}

export const EVENT_LABELS: Record<AutomationEvent, string> = {
  'fichier-importe': 'Nouveau fichier importé',
  'facture-emise': 'Nouvelle facture émise',
}

export function triggerLabel(trigger: AutomationTrigger): string {
  return trigger.kind === 'cron'
    ? `${FREQUENCY_LABELS[trigger.frequency]} · ${trigger.time}`
    : EVENT_LABELS[trigger.event]
}
