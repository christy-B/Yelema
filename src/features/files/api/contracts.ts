/** Catégorie de fichier — sert au filtre par type (tags). */
export type FileType = 'pdf' | 'sheet' | 'doc' | 'other'

export interface FileItem {
  id: string
  name: string
  /** Catégorie pour le filtre par type. */
  type: FileType
  /** Ex. « PDF · 28 pages ». */
  kind: string
  /** Agent associé (libellé). */
  agent: string
  /** Taille formatée, ex. « 2,4 Mo ». */
  size: string
  /** Date formatée, ex. « 12 juin 2026 ». */
  date: string
  storageKey?: string
}

export interface StorageSummary {
  used: string
  quota: string
  count: number
  percent: number
}

/**
 * Connecteur de source de données (Notion, Google Drive, Slack…). Domaine
 * runtime — simulé par MSW en attendant le gateway.
 */
export interface Connector {
  id: string
  /** Fournisseur, sert à l'icône : notion | gdrive | slack | sharepoint… */
  provider: string
  name: string
  status: 'connected' | 'available'
  /** Nombre d'éléments synchronisés (si connecté). */
  count: number | null
  /** Thématique du connecteur (regroupement d'écran). */
  category: string
  /** Métier principal desservi (filtre). */
  metier: string
}
