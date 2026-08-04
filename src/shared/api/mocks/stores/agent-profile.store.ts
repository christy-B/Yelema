/**
 * Réglages par employé IA, en mémoire pour la session.
 *
 * Ce magasin est isolé des handlers parce que deux domaines le lisent : les
 * réglages eux-mêmes (`/agents/:id/profile`) et les ressources partagées
 * (`/agents/:id/resources`), qui ont besoin de savoir quels employés acceptent
 * de partager leur travail. Le control-plane portera ces réglages : ils
 * appartiennent à l'organisation, pas à l'employé.
 */
export interface ProfileSettings {
  active: boolean
  channel: string
  tone: string
  language: string
  detail: string
  instructions: string
  requireApproval: boolean
  /** L'employé met ses sources et ses artefacts à disposition de ses collègues. */
  shareResources: boolean
  /** Portrait demandé : position, style, accessoire, fond. « auto » = au choix de Yelema. */
  avatar: { position: string; style: string; accessory: string; background: string }
  /** Proposition retenue. null = le portrait du catalogue. */
  portrait: { url: string | null; crop: string } | null
}

/** Valeurs admises par axe — un axe hors liste retombe sur « auto ». */
export const AVATAR_AXES: Record<string, string[]> = {
  position: ['auto', 'face', 'trois-quarts', 'assis', 'marche'],
  style: ['auto', 'casual', 'smart-casual', 'business'],
  accessory: ['auto', 'aucun', 'casque', 'ordinateur', 'lunettes'],
  background: ['auto', 'beige', 'gris', 'fonce'],
}

/** Cadrages admis pour une proposition retenue. */
export const PORTRAIT_CROPS = ['serre', 'buste', 'plein']

export const DEFAULT_PROFILE: ProfileSettings = {
  active: true,
  channel: 'web',
  tone: 'chaleureux',
  language: 'fr',
  detail: 'standard',
  instructions: '',
  requireApproval: true,
  shareResources: true,
  avatar: { position: 'auto', style: 'auto', accessory: 'auto', background: 'auto' },
  portrait: null,
}

/**
 * Employés dont le travail reste dans leur espace à l'arrivée : leurs dossiers portent
 * des données que l'organisation ne diffuse pas par défaut. Le réglage reste
 * modifiable depuis leur profil.
 */
const SEED: Record<string, Partial<ProfileSettings>> = {
  exp_mamadou: { shareResources: false },
}

const profiles = new Map<string, ProfileSettings>()

export function getProfile(agentId: string): ProfileSettings {
  return profiles.get(agentId) ?? { ...DEFAULT_PROFILE, ...SEED[agentId] }
}

export function setProfile(agentId: string, next: ProfileSettings): void {
  profiles.set(agentId, next)
}

/** L'employé accepte-t-il que ses collègues exploitent son travail ? */
export function sharesResources(agentId: string): boolean {
  return getProfile(agentId).shareResources
}
