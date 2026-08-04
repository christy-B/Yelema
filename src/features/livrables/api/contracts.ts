/** Type de fichier de l'artefact — sert au filtre par type (tags). */
export type ArtefactType = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'md'

/**
 * Un artefact produit par un employé IA (output d'un skill au fil d'une
 * conversation). Domaine runtime — simulé par MSW en attendant le gateway.
 */
export interface Livrable {
  id: string
  title: string
  /** Type de fichier (pour le filtre par type). */
  type: ArtefactType
  /** Format éditorial du livrable (Note, Tableau, Contrat, Mémo…). */
  format: string
  agentId: string
  agentName: string
  /** Skill d'origine du livrable. */
  skill: string
  /** Date de production (ISO). */
  createdAt: string
  size: string
}

export type LivrablePeriode = 'all' | '7d' | '30d'

/** Libellés des types d'artefact (filtre par tags). */
export const ARTEFACT_TYPE_LABELS: Record<ArtefactType, string> = {
  pdf: 'PDF',
  docx: 'Word',
  xlsx: 'Excel',
  csv: 'CSV',
  md: 'Markdown',
}
