export interface AuthUser {
  id: string
  name: string
  /** Fonction de la personne dans l'organisation (affichée sous le nom). */
  title: string
  email: string
  language: string
  avatarUrl?: string
}

export interface AuthWorkspace {
  id: string
  name: string
  legalName?: string | null
  sector?: string | null
  country?: string | null
  domain: string
  plan: string
  hosting: 'cloud-public' | 'hybride' | 'on-prem-souverain'
  logoUrl?: string
}

/**
 * Permission RBAC telle que renvoyée par l'API (matrice du rôle).
 * Capacités du registre : members | tenant-roles | invoices | agents | branding.
 * Actions : view | create | edit | delete | manage (manage implique tout).
 */
export interface SessionPermission {
  capability: string
  actions: string[]
}

export interface Session {
  user: AuthUser
  workspace: AuthWorkspace
  /** Matrice brute du rôle — vide si le membre n'a pas de rôle (default-deny). */
  permissions: SessionPermission[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  token: string
  expiresAt: string
}

export interface ActivationLookupResponse {
  valid: boolean
  email: string
  name: string
}
