import { apiRequest } from '../../../shared/api/client/http-client'
import type { Automation, CreateAutomationRequest } from './contracts'

export function listAutomations(): Promise<Automation[]> {
  return apiRequest('/automations')
}

export function createAutomation(payload: CreateAutomationRequest): Promise<Automation> {
  return apiRequest('/automations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function setAutomationActive(automationId: string, active: boolean): Promise<Automation> {
  return apiRequest(`/automations/${automationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  })
}

export function deleteAutomation(automationId: string): Promise<void> {
  return apiRequest(`/automations/${automationId}`, { method: 'DELETE' })
}

/** Déclenche l'automatisation immédiatement — l'exécution produit un livrable. */
export function runAutomation(automationId: string): Promise<Automation> {
  return apiRequest(`/automations/${automationId}/run`, { method: 'POST' })
}
