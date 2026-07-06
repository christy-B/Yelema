export type ToolType = 'dust-agent' | 'native-agent' | 'n8n-workflow' | 'openclaw'

export interface AgentSummary {
  id: string
  name: string
  type?: ToolType
  icon: string
  description: string
  tags: string[]
}

/** Un livrable que l'agent sait produire (« Ce qu'il produit »). */
export interface AgentProduct {
  format: string
  title: string
}

export interface AgentDetail extends AgentSummary {
  /** Description longue affichée sur la fiche. */
  long: string
  /** « Ce que fait cet agent ». */
  abilities: string[]
  /** « Ce qu'il produit ». */
  produces: AgentProduct[]
  /** « Ce dont il a besoin ». */
  inputs: string[]
  /** « Utilisé par » — départements / métiers. */
  users: string[]
  /** « Délai estimé ». */
  delay: string
}

/** Un métier regroupe plusieurs agents (un agent peut appartenir à plusieurs métiers). */
export interface Metier {
  id: string
  name: string
  agentIds: string[]
}
