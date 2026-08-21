import { http, HttpResponse } from 'msw'

import { MEMBERS, roleByKey, ROLES, type DemoMember } from './demo-store'
import { provisionAccount } from '../provisioning'
import { API_BASE, notFound, requireAuth, validationError } from './helpers'

/**
 * Membres et rôles, aux formes de l'API v1.
 *
 * Deux points reproduits fidèlement, parce que l'interface en dépend :
 *   - la liste est paginée dans une enveloppe `{ items }` ;
 *   - les restrictions sont une ALLOW-list (`toolRestrictions`) ; l'interface,
 *     elle, raisonne en exclusions et fait la conversion.
 */

/** « members:create » → { capability: 'members', actions: ['create'] }. */
function regrouperPermissions(cles: string[]): { capability: string; actions: string[] }[] {
  const parCapacite = new Map<string, Set<string>>()
  for (const cle of cles) {
    const [capability, action] = cle.split(':')
    if (!capability || !action) continue
    if (!parCapacite.has(capability)) parCapacite.set(capability, new Set())
    parCapacite.get(capability)!.add(action)
  }
  return [...parCapacite].map(([capability, actions]) => ({ capability, actions: [...actions] }))
}

function toDto(member: DemoMember) {
  const role = roleByKey(member.roleKey)
  return {
    id: member.id,
    email: member.email,
    name: member.name,
    status: member.status,
    isFirstAdmin: member.isFirstAdmin,
    role: role ? { key: role.key, name: role.name } : null,
    // Les permissions effectives : celles attribuees a l'invitation si elles
    // existent, sinon celles du role — le role reste un raccourci d'attribution.
    permissions: member.permissions ?? role?.permissions ?? [],
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

    // Inviter, c'est ouvrir un accès : le compte en attente, son jeton
    // d'activation et le message partent ensemble. Auparavant seul le membre
    // était créé — le lien reçu ne contenait donc aucun jeton, et l'activation
    // était impossible.
    // Permissions cochees a l'invitation. Toute paire inconnue est ignoree :
    // l'ecran ne doit pas pouvoir accorder ce que le serveur ne connait pas.
    const envoyees = Array.isArray((body as { permissions?: unknown }).permissions)
      ? ((body as { permissions: unknown[] }).permissions).filter((value): value is string => typeof value === 'string')
      : []
    const permissions = regrouperPermissions(envoyees)

    const { member: created } = provisionAccount({
      name: body.name ?? null,
      email,
      roleKey: body.roleKey ?? null,
      toolRestrictions: body.toolRestrictions ?? [],
      kind: 'invitation',
      permissions,
    })
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

    const body = (await request.json()) as { name?: unknown; roleKey?: unknown; status?: unknown; toolRestrictions?: unknown; permissions?: unknown }

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
    // Les permissions se modifient apres l'invitation : c'est la fiche du
    // membre qui les porte, et le serveur reste l'autorite sur ce qui existe.
    if (Array.isArray(body.permissions)) {
      const envoyees = body.permissions.filter((value): value is string => typeof value === 'string')
      member.permissions = regrouperPermissions(envoyees)
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
