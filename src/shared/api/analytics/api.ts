import { apiRequest } from '../client/http-client'
import type { AnalyticsOverview } from './contracts'

export function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return apiRequest('/analytics/overview')
}
