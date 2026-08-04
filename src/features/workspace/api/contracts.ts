export interface WorkspaceNotifications {
  digestFrequency: 'daily' | 'weekly' | 'none' | null
  alertEmail: string | null
  channels: string[]
}

/** Champ null ⇒ valeur par défaut de la charte Yelema. */
export interface WorkspaceBranding {
  /** URL présignée courte durée — ne jamais mettre en cache. Modifiable via POST /workspace/logo. */
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  buttonColor: string | null
  fontPrimaryColor: string | null
  fontSecondaryColor: string | null
  fontFamily: string | null
}

/** Polices supportées par la plateforme (select fermé côté back). */
export const FONT_FAMILIES = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans 3', 'Work Sans', 'system-ui'] as const

export interface Workspace {
  id: string
  name: string
  legalName: string | null
  plan: string
  hosting: 'cloud-public' | 'hybride' | 'on-prem-souverain'
  sector: string | null
  country: string | null
  /** Seules parties modifiables par le client : le cœur tenant est géré par Yelema. */
  branding: WorkspaceBranding
  notifications: WorkspaceNotifications
}
