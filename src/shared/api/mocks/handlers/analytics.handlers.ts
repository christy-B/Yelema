import { http, HttpResponse } from 'msw'

import type { AnalyticsOverview } from '../../../../features/analytics/api/contracts'
import analyticsFixture from '../fixtures/analytics.json'
import { API_BASE, requireAuth } from './helpers'

const overview = analyticsFixture as AnalyticsOverview

export const analyticsHandlers = [
  http.get(`${API_BASE}/analytics/overview`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    return unauthorized ?? HttpResponse.json(overview)
  }),
]
