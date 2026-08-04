import type { Session, SessionPermission } from './contracts'

/**
 * Test d'une permission (capacité + action) sur une matrice RBAC.
 * Règle serveur reproduite : `manage` implique toutes les autres actions.
 */
export function allows(permissions: SessionPermission[], capability: string, action: string): boolean {
  return permissions.some(
    (permission) =>
      permission.capability === capability &&
      (permission.actions.includes(action) || permission.actions.includes('manage')),
  )
}

/** Le membre connecté peut-il faire `action` sur `capability` ? (session absente ⇒ non) */
export function can(session: Session | null, capability: string, action: string): boolean {
  if (!session) return false
  return allows(session.permissions, capability, action)
}
