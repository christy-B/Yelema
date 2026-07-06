import { useEffect, useMemo, useState } from 'react'

import { getAnalyticsOverview } from '../../../shared/api/analytics/api'
import type { AnalyticsOverview, AnalyticsPeriod } from '../../../shared/api/analytics/contracts'
import { Card } from '../../../shared/components/card/card'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'

const periods: { key: AnalyticsPeriod; label: string }[] = [{ key: 'month', label: 'Mois' }, { key: 'quarter', label: 'Trimestre' }, { key: 'year', label: 'Année' }]
const fmt = new Intl.NumberFormat('fr-FR')

export function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  useEffect(() => {
    void getAnalyticsOverview().then(setOverview).catch(() => setError(true))
  }, [retryKey])

  const series = overview?.series[period]
  const max = useMemo(() => Math.max(1, ...(series?.points.map((point) => point.value) ?? [1])), [series])
  const topMax = useMemo(() => Math.max(1, ...(overview?.topAgents.map((agent) => agent.count) ?? [1])), [overview])
  const userMax = useMemo(() => Math.max(1, ...(overview?.creditsByUser.map((user) => user.credits) ?? [1])), [overview])
  const agentMax = useMemo(() => Math.max(1, ...(overview?.creditsByAgent.map((agent) => agent.credits) ?? [1])), [overview])

  return (
    <>
      <PageHeader title="Analytics" subtitle="Comment vos équipes utilisent l'IA, sur la période choisie." action={<div className="period-tabs">{periods.map((item) => <button key={item.key} type="button" className={period === item.key ? 'is-active' : ''} onClick={() => setPeriod(item.key)}>{item.label}</button>)}</div>} />
      <PageBody>
        {error && <LoadError onRetry={() => { setError(false); setRetryKey((key) => key + 1) }} />}
        {!error && overview && series && (
          <>
            <div className="analytics-stats">
              {overview.stats.map((stat) => (
                <Card key={stat.label}><small>{stat.label}</small><strong>{stat.value}</strong>{stat.delta && <em>{stat.delta}</em>}</Card>
              ))}
            </div>
            <div className="analytics-main">
              <Card className="chart-card">
                <div className="chart-head"><h2>{series.title}</h2><span>{series.sub}</span></div>
                <div className="bar-chart">
                  {series.points.map((point, index) => (
                    <div key={point.label}><span style={{ height: `${Math.max(6, (point.value / max) * 100)}%`, background: index === series.points.length - 1 ? 'var(--primary)' : 'var(--purple-200, #c5c4ff)' }} /><small>{point.label}</small></div>
                  ))}
                </div>
              </Card>
              <Card className="rank-card">
                <h2>Agents les plus sollicités</h2>
                {overview.topAgents.map((agent) => (
                  <div key={agent.name} className="rank-row"><span className="rank-name">{agent.name}</span><span className="rank-value">{fmt.format(agent.count)}</span><span className="rank-bar"><span style={{ width: `${(agent.count / topMax) * 100}%` }} /></span></div>
                ))}
              </Card>
            </div>
            <div className="analytics-tables">
              <Card>
                <h2>Crédits par membre</h2>
                {overview.creditsByUser.map((user) => (
                  <div key={user.userId} className="rank-row"><span className="credit-avatar">{user.initials}</span><span className="rank-name">{user.name}</span><span className="rank-value">{fmt.format(user.credits)} cr.</span><span className="rank-bar"><span style={{ width: `${(user.credits / userMax) * 100}%` }} /></span></div>
                ))}
              </Card>
              <Card>
                <h2>Crédits par agent</h2>
                {overview.creditsByAgent.map((agent) => (
                  <div key={agent.agentId} className="rank-row"><span className="rank-name">{agent.name}</span><span className="rank-value">{fmt.format(agent.credits)} cr.</span><span className="rank-bar"><span style={{ width: `${(agent.credits / agentMax) * 100}%` }} /></span></div>
                ))}
              </Card>
            </div>
          </>
        )}
      </PageBody>
    </>
  )
}
