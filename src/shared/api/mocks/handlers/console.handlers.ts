import { http, HttpResponse } from 'msw'

import { PLANS, ROLES, USERS, WORKSPACE } from './demo-store'
import { validationError } from './helpers'
import { clearMessages, listMessages } from '../stores/outbox.store'
import { activationLink, provisionAccount } from '../provisioning'

/**
 * Console de démonstration — provisionnement des comptes.
 *
 * Ces routes NE FONT PAS PARTIE DE L'API DU PRODUIT. Dans la plateforme réelle,
 * créer une organisation ou inviter un utilisateur relève du control-plane, pas
 * de l'espace client. Elles vivent donc sous `/api/demo` et non sous
 * `/api/v1` : impossible de les confondre avec un contrat, impossible qu'un
 * écran client les appelle par mégarde.
 *
 * Elles existent pour une seule raison : pouvoir dérouler le parcours complet —
 * créer un compte, recevoir son lien, l'activer, arriver dans l'onboarding —
 * sans dépendre d'un back ni d'un serveur de courriel.
 */
const DEMO_BASE = '/api/demo'

export const consoleHandlers = [
  // État courant : l'organisation, les comptes, les rôles et les forfaits.
  http.get(`${DEMO_BASE}/overview`, () => HttpResponse.json({
    workspace: { id: WORKSPACE.id, name: WORKSPACE.name, plan: WORKSPACE.plan },
    plans: PLANS.map((plan) => ({ key: plan.key, name: plan.name, seats: plan.seats })),
    roles: ROLES.map((role) => ({ key: role.key, name: role.name })),
    users: USERS.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      roleKey: user.roleKey,
      /** Présent tant que le compte n'est pas activé — c'est le lien à suivre. */
      activationLink: user.status === 'pending' && user.activationToken ? activationLink(user.activationToken) : null,
    })),
  })),

  // Renommer l'organisation / changer son forfait.
  http.patch(`${DEMO_BASE}/workspace`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; planKey?: string }
    const name = body.name?.trim()
    if (name !== undefined) {
      if (!name) return validationError('Le nom de l’organisation est obligatoire.')
      WORKSPACE.name = name
    }
    if (body.planKey) {
      const plan = PLANS.find((item) => item.key === body.planKey)
      if (!plan) return validationError('Forfait inconnu.')
      WORKSPACE.plan = { key: plan.key, name: plan.name }
    }
    return HttpResponse.json({ id: WORKSPACE.id, name: WORKSPACE.name, plan: WORKSPACE.plan })
  }),

  // Créer un compte : il naît « pending », avec son jeton, et le message part.
  http.post(`${DEMO_BASE}/users`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string; roleKey?: string; jobTitle?: string }
    const name = body.name?.trim()
    const email = body.email?.trim().toLocaleLowerCase('fr')
    if (!name || !email) return validationError('Le nom et l’adresse e-mail sont obligatoires.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return validationError('Cette adresse e-mail n’est pas valide.')
    if (USERS.some((user) => user.email.toLocaleLowerCase('fr') === email)) {
      return validationError('Un compte existe déjà avec cette adresse.')
    }
    const roleKey = body.roleKey ?? 'member'
    if (!ROLES.some((role) => role.key === roleKey)) return validationError('Rôle inconnu.')

    // Même mécanisme que l'invitation depuis l'écran Membres : compte en
    // attente, jeton d'activation et message partent ensemble.
    const { user, link } = provisionAccount({ name, email, roleKey, jobTitle: body.jobTitle })

    return HttpResponse.json({ id: user.id, name: user.name, email, status: user.status, roleKey, activationLink: link }, { status: 201 })
  }),

  // La boîte de réception de démonstration.
  http.get(`${DEMO_BASE}/messages`, () => HttpResponse.json(listMessages())),
  http.delete(`${DEMO_BASE}/messages`, () => { clearMessages(); return new HttpResponse(null, { status: 204 }) }),
]
