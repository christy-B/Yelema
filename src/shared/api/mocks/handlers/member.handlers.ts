import { http, HttpResponse } from 'msw'

import type { AddMemberRequest, CapabilityDefinition, Member } from '../../members/contracts'
import capabilitiesFixture from '../fixtures/capabilities.json'
import { API_BASE, notFound, requireAuth, validationError } from './helpers'
import { addMemberRecord, findMemberRecord, listMemberRecords, removeMemberRecord } from './member-store'

const capabilities = structuredClone(capabilitiesFixture) as CapabilityDefinition[]

export const memberHandlers = [
  http.get(`${API_BASE}/capabilities`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json(capabilities)
  }),

  http.get(`${API_BASE}/members`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json(listMemberRecords())
  }),

  http.post(`${API_BASE}/members`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const body = (await request.json()) as Partial<AddMemberRequest>
    if (!body.email || !body.capabilities || !body.excludedAgentIds) {
      return validationError('L’e-mail, les capacités et les agents exclus sont obligatoires.')
    }

    const member: Member = {
      id: crypto.randomUUID(),
      name: body.email.split('@')[0],
      email: body.email,
      status: 'pending',
      capabilities: body.capabilities,
      excludedAgentIds: body.excludedAgentIds,
    }
    addMemberRecord(member)
    return HttpResponse.json(member, { status: 201 })
  }),

  http.get(`${API_BASE}/members/:memberId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const member = findMemberRecord(String(params.memberId))
    return member ? HttpResponse.json(member) : notFound('Membre introuvable.')
  }),

  http.patch(`${API_BASE}/members/:memberId/capabilities`, async ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const member = findMemberRecord(String(params.memberId))
    if (!member) return notFound('Membre introuvable.')
    const body = (await request.json()) as { capabilities?: string[] }
    if (!body.capabilities) return validationError('Les capacités sont obligatoires.')
    member.capabilities = body.capabilities
    return HttpResponse.json(member)
  }),

  http.patch(`${API_BASE}/members/:memberId/agents`, async ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const member = findMemberRecord(String(params.memberId))
    if (!member) return notFound('Membre introuvable.')
    const body = (await request.json()) as { excludedAgentIds?: string[] }
    if (!body.excludedAgentIds) return validationError('La liste des agents exclus est obligatoire.')
    member.excludedAgentIds = body.excludedAgentIds
    return HttpResponse.json(member)
  }),

  http.delete(`${API_BASE}/members/:memberId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const memberId = String(params.memberId)
    if (!findMemberRecord(memberId)) return notFound('Membre introuvable.')
    removeMemberRecord(memberId)
    return new HttpResponse(null, { status: 204 })
  }),
]
