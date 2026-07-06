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
  domain: string
  plan: string
  hosting: 'cloud-public' | 'cloud-dedie' | 'on-prem-souverain'
  logoUrl?: string
}

/** Capacités tenant — liste canonique (chacune ON/OFF par membre, pas de rôles côté client). */
export type TenantCapability = 'members' | 'billing' | 'analytics' | 'workspace'

export interface Session {
  user: AuthUser
  workspace: AuthWorkspace
  capabilities: TenantCapability[]
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
