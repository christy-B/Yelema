export interface FileItem {
  id: string
  name: string
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
