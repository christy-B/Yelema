import { http, HttpResponse } from 'msw'

import { MEMBERS, roleByKey, ROLES, type DemoMember } from './demo-store'
import { API_BASE, notFound, requireAuth, validationError } from './helpers'

/**
 * Membres et rôles, aux formes de l'API v1.
 *
 * Deux points reproduits fidèlement, parce que l'interface en dépend :
 *   - la liste est paginée dans une enveloppe `{ items }` ;
 *   - les restrictions sont une ALLOW-list (`toolRestrictions`) ; l'interface,
 *     elle, raisonne en exclusions et fait la conversion.
 */

function toDto(member: DemoMember) {
  const role = roleByKey(member.roleKey)
  return {
    id: member.id,
    email: member.email,
    name: member.name,
    status: member.status,
    isFirstAdmin: member.isFirstAdmin,
    role: role ? { key: role.key, name: role.name } : null,
    toolRestrictions: member.toolRestrictions,
  }
}

export const memberHandlers = [
  http.get(`${API_BASE}/roles`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    return HttpResponse.json(
      ROLES.map((role) => ({ key: role.key, name: role.name, description: role.description, builtIn: role.builtIn })),
    )
  }),

  http.get(`${API_BASE}/members`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    return HttpResponse.json({ items: MEMBERS.map(toDto), total: MEMBERS.length })
  }),

  http.post(`${API_BASE}/members`, async ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const body = (await request.json()) as { email?: string; name?: string; roleKey?: string; toolRestrictions?: string[] }
    const email = body.email?.trim().toLocaleLowerCase('fr')
    if (!email) return validationError('L’adresse e-mail est obligatoire.')
    if (MEMBERS.some((member) => member.email.toLocaleLowerCase('fr') === email)) {
      return validationError('Ce membre fait déjà partie de l’espace de travail.')
    }
    if (body.roleKey && !roleByKey(body.roleKey)) {
      return validationError('Ce rôle n’existe pas.')
    }

    const created: DemoMember = {
      id: `u_${Math.random().toString(36).slice(2, 8)}`,
      email,
      name: body.name?.trim() || null,
      // Un membre invité reste « invited » jusqu'à l'activation de son accès.
      status: 'invited',
      isFirstAdmin: false,
      roleKey: body.roleKey ?? null,
      toolRestrictions: body.toolRestrictions ?? [],
    }
    MEMBERS.push(created)
    return HttpResponse.json(toDto(created), { status: 201 })
  }),

  http.get(`${API_BASE}/members/:memberId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const member = MEMBERS.find((item) => item.id === String(params.memberId))
    return member ? HttpResponse.json(toDto(member)) : notFound('Membre introuvable.')
  }),

  http.patch(`${API_BASE}/members/:memberId`, async ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const member = MEMBERS.find((item) => item.id === String(params.memberId))
    if (!member) return notFound('Membre introuvable.')

    const body = (await request.json()) as { name?: unknown; roleKey?: unknown; status?: unknown; toolRestrictions?: unknown }

    if (typeof body.name === 'string') member.name = body.name.trim() || null
    if (typeof body.roleKey === 'string' || body.roleKey === null) {
      const key = body.roleKey as string | null
      if (key && !roleByKey(key)) return validationError('Ce rôle n’existe pas.')
      // Le premier administrateur garde son rôle : sinon l'espace devient ingérable.
      if (member.isFirstAdmin && key !== member.roleKey) {
        return validationError('Le rôle du premier administrateur ne peut pas être modifié.')
      }
      member.roleKey = key
    }
    if (body.status === 'active' || body.status === 'suspended' || body.status === 'invited') {
      if (member.isFirstAdmin && body.status !== 'active') {
        return validationError('Le premier administrateur doit rester actif.')
      }
      member.status = body.status
    }
    if (Array.isArray(body.toolRestrictions)) {
      member.toolRestrictions = body.toolRestrictions.filter((value): value is string => typeof value === 'string')
    }

    return HttpResponse.json(toDto(member))
  }),

  http.delete(`${API_BASE}/members/:memberId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const index = MEMBERS.findIndex((item) => item.id === String(params.memberId))
    if (index === -1) return notFound('Membre introuvable.')
    if (MEMBERS[index].isFirstAdmin) {
      return validationError('Le premier administrateur ne peut pas être retiré.')
    }
    MEMBERS.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
