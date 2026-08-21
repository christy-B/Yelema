export type MemberStatus = 'active' | 'pending' | 'suspended'

export interface MemberRole {
  key: string
  name: string
}

/** Rôle du registre tenant (lecture seule en v1 — built-ins copiés par tenant). */
/** Ce qu'un rôle autorise : capacité + actions permises. */
export interface RolePermission {
  capability: string
  actions: string[]
}

export interface RoleDefinition {
  key: string
  name: string
  description?: string | null
  builtIn?: boolean
  /**
   * Permissions du rôle. C'est ce que l'écran des membres affiche : le nom du
   * rôle ne dit rien à un client, la liste de ce qu'il autorise si.
   */
  permissions?: RolePermission[]
}

/**
 * Permissions attribuables à un membre, une par ligne d'écran.
 *
 * Volontairement formulées comme des actions concrètes : « Ajouter un membre »
 * plutôt que « members:create ». C'est cette liste que l'invitation présente,
 * et c'est elle qui remplace le choix d'un rôle.
 */
export interface MemberPermissionOption {
  capability: string
  action: string
  label: string
  /** Ce que la permission autorise, en une ligne. */
  hint: string
}

/**
 * Trois permissions de gestion, et c'est tout. Decouper en voir / creer /
 * modifier / retirer par domaine donnait dix cases a arbitrer : un niveau de
 * detail d'administrateur systeme, pas de client.
 */
export const MEMBER_PERMISSIONS: MemberPermissionOption[] = [
  { capability: 'members', action: 'manage', label: 'Gestion des membres', hint: 'Inviter, modifier et retirer des membres' },
  { capability: 'invoices', action: 'manage', label: 'Gestion de la facturation', hint: 'Consulter les factures et changer de formule' },
  { capability: 'branding', action: 'manage', label: 'Gestion de l’organisation', hint: 'Nom, logo et réglages de l’espace de travail' },
]

/** Clé stable d'une permission, pour les cases à cocher et les envois. */
export const permissionKey = (capability: string, action: string) => `${capability}:${action}`

/** Libellés lisibles des capacités, dans l'ordre où on les présente. */
export const CAPABILITY_LABELS: Record<string, string> = {
  members: 'Membres',
  invoices: 'Facturation',
  branding: 'Organisation',
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
   * Permissions effectives du membre, telles que le serveur les calcule.
   * C'est ce que l'écran affiche et ce que l'invitation renseigne.
   */
  permissions: RolePermission[]
  /**
   * Agents retirés au membre — vue « deny-list » de l'interface, convertie
   * depuis/vers la `toolRestrictions` (allow-list) de l'API réelle.
   */
  excludedAgentIds: string[]
}

export interface AddMemberRequest {
  email: string
  name?: string
  /** Permissions cochees a l'invitation, au format capacite:action. */
  permissionKeys?: string[]
  excludedAgentIds: string[]
}
