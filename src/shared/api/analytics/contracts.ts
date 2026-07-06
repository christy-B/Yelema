export type AnalyticsPeriod = 'month' | 'quarter' | 'year'

export interface AnalyticsStat {
  label: string
  value: string
  delta?: string
}

export interface AnalyticsSeries {
  title: string
  sub: string
  points: { label: string; value: number }[]
}

export interface AnalyticsOverview {
  stats: AnalyticsStat[]
  series: Record<AnalyticsPeriod, AnalyticsSeries>
  topAgents: { name: string; count: number }[]
  creditsByUser: { userId: string; name: string; initials: string; credits: number }[]
  creditsByAgent: { agentId: string; name: string; credits: number }[]
}
