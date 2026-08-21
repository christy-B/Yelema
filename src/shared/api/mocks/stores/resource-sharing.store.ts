/**
 * Partage et suppression, ressource par ressource.
 *
 * Le profil d'un expert porte déjà un réglage global `shareResources` : tout ou
 * rien. C'est trop grossier — un expert peut vouloir partager sa grille
 * tarifaire sans ouvrir le fichier clients. Ce magasin tient donc la décision
 * pièce par pièce, et le réglage global ne sert plus que de valeur par défaut.
 *
 * Une ressource retirée l'est pour son propriétaire ET pour ceux qui la
 * voyaient : c'est une suppression, pas un masquage.
 */
const explicitlyShared = new Set<string>()
const explicitlyPrivate = new Set<string>()
const removed = new Set<string>()

/** Partage effectif : la décision par pièce prime sur le réglage global. */
export function isShared(resourceId: string, fallback: boolean): boolean {
  if (explicitlyShared.has(resourceId)) return true
  if (explicitlyPrivate.has(resourceId)) return false
  return fallback
}

export function setShared(resourceId: string, shared: boolean): void {
  if (shared) {
    explicitlyShared.add(resourceId)
    explicitlyPrivate.delete(resourceId)
  } else {
    explicitlyPrivate.add(resourceId)
    explicitlyShared.delete(resourceId)
  }
}

export function remove(resourceId: string): void {
  removed.add(resourceId)
  explicitlyShared.delete(resourceId)
  explicitlyPrivate.delete(resourceId)
}

export function isRemoved(resourceId: string): boolean {
  return removed.has(resourceId)
}
