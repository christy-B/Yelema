import {
  MEMBERS,
  persistProvisioned,
  PROVISIONED_PREFIX,
  USERS,
  WORKSPACE,
  type DemoMember,
  type DemoUser,
} from './handlers/demo-store'
import { deliver, type DemoMessageKind } from './stores/outbox.store'

/**
 * Ouverture d'un accès — le geste unique derrière deux écrans.
 *
 * Inviter un membre depuis l'espace client et créer un compte depuis la console
 * de démonstration produisent exactement la même chose : un compte en attente,
 * son jeton d'activation, et le message que la plateforme aurait envoyé.
 *
 * Ce module existe parce que les deux chemins avaient divergé : la console
 * fabriquait un jeton, l'invitation non — le lien reçu était donc vide et
 * l'activation impossible.
 */

/** Chemin d'activation ouvert par le destinataire du message. */
export const activationLink = (token: string) =>
  `/espace-client/activation?token=${encodeURIComponent(token)}`

/** Identifiant suivant. Repart des comptes déjà présents — réhydratés depuis le
 *  stockage local — pour ne pas réattribuer un identifiant existant. */
function nextId(): string {
  const used = USERS
    .filter((user) => user.id.startsWith(PROVISIONED_PREFIX))
    .map((user) => Number.parseInt(user.id.slice(PROVISIONED_PREFIX.length), 10))
    .filter((value) => Number.isFinite(value))
  return `${PROVISIONED_PREFIX}${(used.length > 0 ? Math.max(...used) : 0) + 1}`
}

export interface ProvisionRequest {
  name: string | null
  email: string
  roleKey: string | null
  jobTitle?: string
  /** Restrictions d'experts, quand l'accès vient de l'écran Membres. */
  toolRestrictions?: string[]
  /** Change le texte du message ; le mécanisme, lui, est identique. */
  kind?: DemoMessageKind
  /** Permissions accordées à l'invitation, si l'écran en a coché. */
  permissions?: { capability: string; actions: string[] }[]
}

export interface ProvisionResult {
  user: DemoUser
  member: DemoMember
  link: string
}

export function provisionAccount(request: ProvisionRequest): ProvisionResult {
  const id = nextId()
  const token = `activation-${crypto.randomUUID().slice(0, 8)}`
  const name = request.name?.trim() || null

  const user: DemoUser = {
    id,
    name: name ?? request.email,
    email: request.email,
    // Pas de mot de passe tant que le compte n'est pas activé.
    password: null,
    token: `demo-token-${id}`,
    status: 'pending',
    jobTitle: request.jobTitle?.trim() || '',
    avatarUrl: null,
    isFirstAdmin: false,
    roleKey: request.roleKey ?? 'member',
    preferences: { twofa: false, mailDigest: false, usageAlerts: false },
    activationToken: token,
  }
  const member: DemoMember = {
    id,
    email: request.email,
    name,
    status: 'invited',
    isFirstAdmin: false,
    roleKey: request.roleKey,
    toolRestrictions: request.toolRestrictions ?? [],
    permissions: request.permissions,
  }

  USERS.push(user)
  MEMBERS.push(member)
  // Le lien d'activation s'ouvre après un chargement complet : le compte doit
  // survivre au rechargement, sinon son jeton devient aussitôt inconnu.
  persistProvisioned()

  const link = activationLink(token)
  const appele = name ?? request.email
  deliver({
    kind: request.kind ?? 'activation',
    to: request.email,
    toName: appele,
    subject: `Votre accès à ${WORKSPACE.name}`,
    body: `Bonjour ${appele}, un accès à l’espace client de ${WORKSPACE.name} vous a été ouvert. Choisissez votre mot de passe pour l’activer. Ce lien ne fonctionne qu’une fois.`,
    link,
  })

  return { user, member, link }
}
