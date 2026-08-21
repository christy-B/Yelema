export type ProjectDetailTab = 'overview' | 'activity' | 'resources' | 'artifacts' | 'connectors'

export interface ProjectTabDefinition {
  key: ProjectDetailTab
  label: string
}

/**
 * Les onglets d'un projet. Le chef de projet n'en est pas un : on
 * ouvre sa fiche d'expert depuis sa ligne, dans l'equipe. Sans compteurs : un chiffre a cote du libelle
 * n'aide a rien — on ouvre l'onglet pour voir, pas pour compter.
 */
export function projectDetailTabs(): ProjectTabDefinition[] {
  return [
    { key: 'overview', label: 'Vue d’ensemble' },
    { key: 'activity', label: 'Activité' },
    { key: 'resources', label: 'Ressources' },
    { key: 'artifacts', label: 'Livrables' },
    { key: 'connectors', label: 'Connecteurs' },
  ]
}
