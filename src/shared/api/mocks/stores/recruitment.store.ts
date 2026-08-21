/**
 * Prises de poste en attente.
 *
 * Le recrutement (`agent.handlers`) et les conversations
 * (`conversation.handlers`) sont deux familles de routes distinctes : ce petit
 * relais leur évite de se connaître. Le recrutement dépose l'identifiant de
 * l'expert, la première lecture des conversations matérialise son message
 * d'ouverture — une seule fois, comme le ferait le back.
 */
/**
 * Le chef de projet y figure d'entrée : il n'est pas recruté, il vient avec les
 * projets — sa prise de poste existe donc dès la première lecture, sans quoi
 * son espace s'ouvrirait sur une conversation vide alors qu'il est censé avoir
 * engagé l'échange.
 */
const pending = new Set<string>(['orc_dany'])

export function queueOpening(agentId: string): void {
  pending.add(agentId)
}

/** Rend les prises de poste en attente et vide la file. */
export function drainOpenings(): string[] {
  const ids = [...pending]
  pending.clear()
  return ids
}
