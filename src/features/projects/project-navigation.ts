export type ProjectDetailTab = 'overview' | 'activity' | 'resources' | 'artifacts' | 'connectors'

interface ProjectTabCounts {
  activities: number
  resources: number
  artifacts: number
  connectors: number
}

export interface ProjectTabDefinition {
  key: ProjectDetailTab
  label: string
  count?: number
}

export function projectDetailTabs(counts: ProjectTabCounts): ProjectTabDefinition[] {
  return [
    { key: 'overview', label: 'Vue d’ensemble' },
    { key: 'activity', label: 'Activité', count: counts.activities },
    { key: 'resources', label: 'Ressources', count: counts.resources },
    { key: 'artifacts', label: 'Artefacts', count: counts.artifacts },
    { key: 'connectors', label: 'Connecteurs', count: counts.connectors },
  ]
}
