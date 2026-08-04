export type MemberStatus = 'active' | 'pending' | 'suspended'

export interface MemberRole {
  key: string
  name: string
}

/** Rôle du registre tenant (lecture seule en v1 — built-ins copiés par tenant). */
export interface RoleDefinition {
  key: string
  name: string
  description?: string | null
  builtIn?: boolean
}

export interface Member {
  id: string
  name: string
  email: string
  initials?: string
  color?: string
  status: MemberStatus
  isFirstAdmin: boolean
  /** Rôle RBAC (null ⇒ aucune permission, default-deny serveur). */
  role: MemberRole | null
  /**
   * Agents retirés au membre — vue « deny-list » de l'interface, convertie
   * depuis/vers la `toolRestrictions` (allow-list) de l'API réelle.
   */
  excludedAgentIds: string[]
}

export interface AddMemberRequest {
  email: string
  name?: string
  roleKey?: string
  excludedAgentIds: string[]
}
