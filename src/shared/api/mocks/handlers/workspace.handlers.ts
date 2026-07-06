import { http, HttpResponse } from 'msw'

import type { Workspace } from '../../workspace/contracts'
import workspaceFixture from '../fixtures/workspace.json'
import { API_BASE, requireAuth } from './helpers'

let workspace = structuredClone(workspaceFixture) as Workspace

export const workspaceHandlers = [
  http.get(`${API_BASE}/workspace`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json(workspace)
  }),

  http.patch(`${API_BASE}/workspace`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const patch = (await request.json()) as Partial<Workspace>
    workspace = { ...workspace, ...patch }
    return HttpResponse.json(workspace)
  }),

  http.post(`${API_BASE}/workspace/logo`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json({ logoUrl: '/mock-assets/logos/ws_3-updated.png' })
  }),
]
