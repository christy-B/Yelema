/**
 * MAGASIN DE DÉMONSTRATION — version autonome de l'application.
 *
 * Ici, aucun control-plane : ce module tient en mémoire les comptes, les membres,
 * l'espace de travail et la facturation, aux formes exactes de l'API v1. Les
 * handlers renvoient donc ce que le vrai serveur renverrait, et les adaptateurs
 * du front n'ont rien à savoir de cette substitution.
 *
 * L'état vit le temps de l'onglet : un rechargement remet la démonstration à
 * son point de départ, ce qui est le comportement attendu d'une vitrine.
 */

// Logo du locataire de démonstration. Il vit dans le dossier des mocks, et non
// dans les assets de l'application : c'est une donnée de démonstration, pas un
// élément de la charte Yelema. En production, ce logo vient du back-office.
import tenantMark from '../assets/banque-atlantique-mark.jpg'

/** Comptes connectables. Le jeton sert de porteur d'identité pour toute l'API. */
export interface DemoUser {
  id: string
  name: string
  email: string
  password: string | null
  token: string
  status: 'active' | 'pending'
  jobTitle: string
  avatarUrl: string | null
  isFirstAdmin: boolean
  roleKey: string
  preferences: { twofa: boolean; mailDigest: boolean; usageAlerts: boolean }
  /**
   * Jeton d'activation propre au compte, tant qu'il est « pending ». Les
   * comptes créés depuis la console de démonstration en reçoivent chacun un —
   * là où la démonstration d'origine n'en connaissait qu'un seul, partagé
   * (voir ACTIVATION).
   */
  activationToken?: string | null
}

/** Matrice RBAC d'un rôle, telle que /auth/me la renvoie. */
export interface DemoRole {
  key: string
  name: string
  description: string | null
  builtIn: boolean
  permissions: { capability: string; actions: string[] }[]
}

export const ROLES: DemoRole[] = [
  {
    key: 'owner',
    name: 'Propriétaire',
    description: "Tous les droits sur l'espace de travail.",
    builtIn: true,
    permissions: [
      { capability: 'members', actions: ['manage'] },
      { capability: 'invoices', actions: ['manage'] },
      { capability: 'branding', actions: ['manage'] },
      { capability: 'agents', actions: ['manage'] },
    ],
  },
  {
    key: 'admin',
    name: 'Administrateur',
    description: "Gestion de l'équipe et de la facturation.",
    builtIn: true,
    permissions: [
      { capability: 'members', actions: ['view', 'create', 'edit', 'delete'] },
      { capability: 'invoices', actions: ['view'] },
      { capability: 'branding', actions: ['view', 'edit'] },
      { capability: 'agents', actions: ['view', 'use'] },
    ],
  },
  {
    key: 'member',
    name: 'Membre',
    description: 'Accès aux experts et à ses conversations.',
    builtIn: true,
    permissions: [
      { capability: 'agents', actions: ['view', 'use'] },
    ],
  },
]

export const USERS: DemoUser[] = [
  {
    id: 'u_12',
    name: 'Aïcha Koné',
    email: 'admin@banque-atlantique.ci',
    password: 'DemoYelema2026!',
    token: 'demo-token-u_12',
    status: 'active',
    jobTitle: 'Directrice de la transformation',
    avatarUrl: null,
    isFirstAdmin: true,
    roleKey: 'owner',
    preferences: { twofa: false, mailDigest: true, usageAlerts: true },
  },
  {
    id: 'u_18',
    name: 'Bakary Diallo',
    email: 'b.diallo@banque-atlantique.ci',
    password: 'DemoYelema2026!',
    token: 'demo-token-u_18',
    status: 'active',
    jobTitle: 'Analyste budgétaire',
    avatarUrl: null,
    isFirstAdmin: false,
    roleKey: 'member',
    preferences: { twofa: false, mailDigest: false, usageAlerts: false },
  },
]

/** Jeton d'activation d'un membre invité, pour la démonstration du parcours. */
export const ACTIVATION = {
  token: 'demo-activation-token',
  email: 'n.sow@banque-atlantique.ci',
  name: 'Nadège Sow',
}

/**
 * Compte en attente correspondant à un jeton d'activation. Couvre les comptes
 * créés depuis la console ; le jeton historique ACTIVATION reste valable pour
 * ne pas casser la démonstration existante.
 */
export function pendingByActivationToken(token: string): DemoUser | undefined {
  return USERS.find((user) => user.status === 'pending' && user.activationToken === token)
}


export interface DemoMember {
  id: string
  email: string
  name: string | null
  status: 'active' | 'invited' | 'suspended'
  isFirstAdmin: boolean
  roleKey: string | null
  /** Allow-list : vide ⇒ tous les experts du plan. */
  toolRestrictions: string[]
}

export const MEMBERS: DemoMember[] = [
  { id: 'u_12', email: 'admin@banque-atlantique.ci', name: 'Aïcha Koné', status: 'active', isFirstAdmin: true, roleKey: 'owner', toolRestrictions: [] },
  { id: 'u_18', email: 'b.diallo@banque-atlantique.ci', name: 'Bakary Diallo', status: 'active', isFirstAdmin: false, roleKey: 'member', toolRestrictions: ['exp_mamadou', 'exp_salif'] },
  { id: 'u_20', email: 'n.sow@banque-atlantique.ci', name: 'Nadège Sow', status: 'invited', isFirstAdmin: false, roleKey: 'admin', toolRestrictions: [] },
  { id: 'u_24', email: 'k.traore@banque-atlantique.ci', name: 'Kader Traoré', status: 'active', isFirstAdmin: false, roleKey: 'member', toolRestrictions: [] },
]

export const WORKSPACE = {
  id: 'ws_3',
  name: 'Banque Atlantique CI',
  legalName: 'Banque Atlantique Côte d’Ivoire SA',
  slug: 'banque-atlantique-ci',
  status: 'active',
  hosting: 'cloud-public',
  sector: 'Banque et assurance',
  country: 'Côte d’Ivoire',
  plan: { key: 'souverain', name: 'Souverain' } as { key: string; name: string } | null,
  branding: {
    logoUrl: tenantMark as string | null,
    primaryColor: '#5B34C4',
    secondaryColor: '#2A1A5E',
    buttonColor: '#5B34C4',
    fontPrimaryColor: '#1C1F27',
    fontSecondaryColor: '#596178',
    fontFamily: 'Inter',
  },
  notifications: {
    digestFrequency: 'weekly' as string | null,
    alertEmail: 'admin@banque-atlantique.ci' as string | null,
    channels: ['email'],
  },
}

export const PLANS = [
  { key: 'essentiel', name: 'Essentiel', currency: 'XOF', amount: 300000, period: 'mois', seats: 10, description: 'Le premier expert, tout compris.' },
  { key: 'equipe', name: 'Équipe', currency: 'XOF', amount: 900000, period: 'mois', seats: 30, description: 'Jusqu’à quatre experts.' },
  { key: 'souverain', name: 'Souverain', currency: 'XOF', amount: 2400000, period: 'mois', seats: 100, description: 'Hébergement souverain, experts illimités.' },
]

export const SUMMARY = {
  plan: { key: 'souverain', name: 'Souverain' },
  currency: 'XOF',
  next: { amount: 2400000, date: '2026-09-01' },
  consumption: 41,
  included: 100,
}

export interface DemoInvoice {
  id: string
  reference: string
  period: string
  status: string
  amountTTC: number
  amountHT: number
  currency: string
  issuedAt: string
  lineItems: { label: string; quantity: number | null; unitAmount: number | null; amount: number | null }[]
  tax: { scheme: string; rate: number | null; amount: number | null } | null
}

export const INVOICES: DemoInvoice[] = [
  {
    id: 'inv_2026_07', reference: 'INV-2026-07-0031', period: 'Juillet 2026', status: 'paid',
    amountTTC: 2832000, amountHT: 2400000, currency: 'XOF', issuedAt: '2026-07-01',
    lineItems: [
      { label: 'Abonnement Souverain — juillet 2026', quantity: 1, unitAmount: 2400000, amount: 2400000 },
    ],
    tax: { scheme: 'TVA Côte d’Ivoire', rate: 18, amount: 432000 },
  },
  {
    id: 'inv_2026_06', reference: 'INV-2026-06-0028', period: 'Juin 2026', status: 'paid',
    amountTTC: 2832000, amountHT: 2400000, currency: 'XOF', issuedAt: '2026-06-01',
    lineItems: [
      { label: 'Abonnement Souverain — juin 2026', quantity: 1, unitAmount: 2400000, amount: 2400000 },
    ],
    tax: { scheme: 'TVA Côte d’Ivoire', rate: 18, amount: 432000 },
  },
  {
    id: 'inv_2026_05', reference: 'INV-2026-05-0022', period: 'Mai 2026', status: 'late',
    amountTTC: 1062000, amountHT: 900000, currency: 'XOF', issuedAt: '2026-05-01',
    lineItems: [
      { label: 'Abonnement Équipe — mai 2026', quantity: 1, unitAmount: 900000, amount: 900000 },
    ],
    tax: { scheme: 'TVA Côte d’Ivoire', rate: 18, amount: 162000 },
  },
]

export function userByToken(token: string): DemoUser | undefined {
  return USERS.find((user) => user.token === token)
}

export function roleByKey(key: string | null): DemoRole | undefined {
  return key ? ROLES.find((role) => role.key === key) : undefined
}

/* ── Persistance des comptes provisionnés ────────────────────────────────────
 * Les mocks vivent en mémoire, donc un rechargement de page les efface. Sans
 * importance pour les données de démonstration figées — mais pas pour un compte
 * créé depuis la console : son lien d'activation s'ouvre justement après un
 * chargement complet, souvent dans un autre onglet. Les comptes provisionnés
 * sont donc les seuls à survivre, dans le stockage local.
 *
 * Ce bloc est en fin de fichier À DESSEIN : il s'exécute au chargement du
 * module et référence USERS et MEMBERS, qui doivent être déclarés avant lui. */
const PROVISIONED_KEY = 'yelema.demo.provisioned.v1'

/** Préfixe des identifiants créés depuis la console — les seuls persistés. */
export const PROVISIONED_PREFIX = 'u_c'

export function persistProvisioned(): void {
  try {
    localStorage.setItem(PROVISIONED_KEY, JSON.stringify({
      users: USERS.filter((user) => user.id.startsWith(PROVISIONED_PREFIX)),
      members: MEMBERS.filter((member) => member.id.startsWith(PROVISIONED_PREFIX)),
    }))
  } catch {
    // Stockage indisponible (navigation privée…) : la console reste utilisable
    // dans l'onglet courant, seul le rechargement perd les comptes créés.
  }
}

export function forgetProvisioned(): void {
  try { localStorage.removeItem(PROVISIONED_KEY) } catch { /* voir ci-dessus */ }
  for (const list of [USERS as { id: string }[], MEMBERS as { id: string }[]]) {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (list[index].id.startsWith(PROVISIONED_PREFIX)) list.splice(index, 1)
    }
  }
}

// Réhydratation, avant que le moindre handler ne serve une requête.
try {
  const saved = JSON.parse(localStorage.getItem(PROVISIONED_KEY) ?? 'null') as
    | { users?: DemoUser[]; members?: DemoMember[] }
    | null
  for (const user of saved?.users ?? []) if (!USERS.some((item) => item.id === user.id)) USERS.push(user)
  for (const member of saved?.members ?? []) if (!MEMBERS.some((item) => item.id === member.id)) MEMBERS.push(member)
} catch {
  try { localStorage.removeItem(PROVISIONED_KEY) } catch { /* rien de plus à faire */ }
}
