export type AnalyticsPeriod = 'month' | 'quarter' | 'semester' | 'year'

export interface AnalyticsSeries {
  /** Intitulé de l'axe, fourni par le serveur avec les points. */
  sub: string
  points: { label: string; value: number }[]
}

/** Ce qu'un employé IA a abattu sur la période. */
export interface AgentPerformance {
  agentId: string
  name: string
  /**
   * Salaire mensuel, en F CFA. Par expert et non global : rien ne garantit
   * qu'ils resteront tous au même tarif, et un chiffre unique interdirait de
   * les faire diverger sans refondre l'écran.
   */
  monthlySalary: number
  tasksDone: number
  tasksRunning: number
  deliverables: number
}

/** Un humain de l'organisation, et ce qu'il a fait sur la période. */
export interface MemberActivity {
  userId: string
  name: string
  initials: string
  role: string
  /** Tâches qu'il a confiées à un expert sur la période. */
  tasks: number
  /** Ressources qu'il a versées aux experts ou aux projets. */
  resources: number
  /** Livrables issus des tâches qu'il a confiées. */
  deliverables: number
  /** Connecteurs qu'il utilise — ses accès, pas ceux de l'organisation. */
  connectors: number
  /** Dernière connexion, au format ISO. `null` si le compte n'a jamais servi. */
  lastSeenAt: string | null
  /** Actif sur la période : au moins une tâche confiée ou une pièce versée. */
  active: boolean
}

/**
 * Sert UNIQUEMENT à classer le tableau, jamais à l'affichage : additionner des
 * tâches et des fichiers ne produit aucune grandeur réelle. Les connecteurs en
 * sont exclus — les avoir liés une fois ne dit rien de l'activité du mois.
 */
export function memberTotal(member: MemberActivity): number {
  return member.tasks + member.resources + member.deliverables
}

/** Un connecteur et ce qu'il a réellement servi sur la période. */
export interface ConnectorUsage {
  provider: string
  name: string
  /** Éléments consultés ou synchronisés par les experts. */
  items: number
  connected: boolean
}

/** Ce qui entre dans l'organisation et ce qui en sort. */
export interface ResourceVolume {
  /** Documents fournis aux experts sur la période. */
  inputs: number
  /** Livrables produits par les experts. */
  deliverables: number
  /** Pièces mises à disposition de toute l'équipe. */
  shared: number
  /** Répartition des pièces par format, du plus au moins fréquent. */
  byFormat: { format: string; count: number }[]
}

/**
 * Tout ce que l'écran montre, pour UNE période.
 *
 * Le découpage par période vit dans les données et non dans l'écran : le filtre
 * en tête gouverne alors l'ensemble des blocs, sans qu'aucun ne puisse rester
 * figé sur un mois pendant que les autres affichent l'année.
 */
export interface AnalyticsSnapshot {
  tasksDone: number
  deliverables: number
  /** Écart avec la période précédente, en points de pourcentage signés. */
  tasksDelta: number
  deliverablesDelta: number
  series: AnalyticsSeries
  perAgent: AgentPerformance[]
  perMember: MemberActivity[]
  connectors: ConnectorUsage[]
  resources: ResourceVolume
}

export interface AnalyticsOverview {
  /** Employés IA au service de l'organisation. */
  headcount: number
  /** Comptes humains rattachés à l'espace de travail. */
  seats: number
  periods: Record<AnalyticsPeriod, AnalyticsSnapshot>
}

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  month: 'Mois',
  quarter: 'Trimestre',
  semester: 'Semestre',
  year: 'Année',
}

/** Masse salariale : la somme des salaires, jamais un effectif multiplié. */
export function payrollOf(agents: AgentPerformance[]): number {
  return agents.reduce((total, agent) => total + agent.monthlySalary, 0)
}
