import { apiRequest } from '../client/http-client'
import type { Workspace } from './contracts'

export function getWorkspace(): Promise<Workspace> {
  return apiRequest('/workspace')
}

export function updateWorkspace(payload: Partial<Workspace>): Promise<Workspace> {
  return apiRequest('/workspace', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateWorkspaceLogo(file: File): Promise<{ logoUrl: string }> {
  const body = new FormData()
  body.append('file', file)
  return apiRequest('/workspace/logo', { method: 'POST', body })
}
