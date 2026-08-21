/**
 * Experts rattachés à l'organisation — son équipe.
 *
 * Source UNIQUE : `agent.handlers` et `resource.handlers` en tenaient chacun
 * leur copie en dur, si bien qu'un expert recruté apparaissait dans un écran
 * mais pas dans l'autre. Le recrutement ajoute ici, et les deux lisent ici.
 *
 * Ce rattachement est un état d'organisation, pas une propriété de l'expert :
 * il viendra du control-plane (plan souscrit).
 */
const team = new Set([
  'exp_kouassi',
  'exp_awa',
  'exp_fatima',
  'exp_fatou',
  'exp_mamadou',
  'exp_ibrahim',
  'exp_salif',
  'exp_nadia',
  // Le chef de projet. Rattaché comme les autres pour que sa fiche et sa
  // conversation s'ouvrent normalement ; `agent.handlers` le retire en
  // revanche de la LISTE des experts — on ne le recrute pas, il vient avec
  // les projets.
  'orc_dany',
])

export function isInTeam(agentId: string): boolean {
  return team.has(agentId)
}

export function addToTeam(agentId: string): void {
  team.add(agentId)
}

export function teamIds(): string[] {
  return [...team]
}
