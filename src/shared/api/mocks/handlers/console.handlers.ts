import { http, HttpResponse } from 'msw'

import { MEMBERS, persistProvisioned, PLANS, PROVISIONED_PREFIX, ROLES, USERS, WORKSPACE } from './demo-store'
import { validationError } from './helpers'
import { clearMessages, deliver, listMessages } from '../stores/outbox.store'

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

/** Chemin d'activation ouvert par le destinataire du message. */
const activationLink = (token: string) => `/espace-client/activation?token=${encodeURIComponent(token)}`

/**
 * Prochain numéro de compte. Repart des comptes déjà présents — réhydratés
 * depuis le stockage local — pour ne pas réattribuer un identifiant existant
 * après un rechargement.
 */
function nextId(): string {
  const used = USERS
    .filter((user) => user.id.startsWith(PROVISIONED_PREFIX))
    .map((user) => Number.parseInt(user.id.slice(PROVISIONED_PREFIX.length), 10))
    .filter((value) => Number.isFinite(value))
  return `${PROVISIONED_PREFIX}${(used.length > 0 ? Math.max(...used) : 0) + 1}`
}

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

    const id = nextId()
    const token = `activation-${crypto.randomUUID().slice(0, 8)}`
    USERS.push({
      id,
      name,
      email,
      // Pas de mot de passe tant que le compte n'est pas activé.
      password: null,
      token: `demo-token-${id}`,
      status: 'pending',
      jobTitle: body.jobTitle?.trim() || '',
      avatarUrl: null,
      isFirstAdmin: false,
      roleKey,
      preferences: { twofa: false, mailDigest: false, usageAlerts: false },
      activationToken: token,
    })
    MEMBERS.push({ id, email, name, status: 'invited', isFirstAdmin: false, roleKey, toolRestrictions: [] })
    // Le lien d'activation s'ouvre après un chargement complet : le compte doit
    // survivre au rechargement, sinon son jeton devient inconnu.
    persistProvisioned()

    const link = activationLink(token)
    deliver({
      kind: 'activation',
      to: email,
      toName: name,
      subject: `Votre accès à ${WORKSPACE.name}`,
      body: `Bonjour ${name}, un accès à l’espace client de ${WORKSPACE.name} vous a été ouvert. Choisissez votre mot de passe pour l’activer. Ce lien ne fonctionne qu’une fois.`,
      link,
    })

    return HttpResponse.json({ id, name, email, status: 'pending', roleKey, activationLink: link }, { status: 201 })
  }),

  // La boîte de réception de démonstration.
  http.get(`${DEMO_BASE}/messages`, () => HttpResponse.json(listMessages())),
  http.delete(`${DEMO_BASE}/messages`, () => { clearMessages(); return new HttpResponse(null, { status: 204 }) }),
]
