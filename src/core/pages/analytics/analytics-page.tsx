import { Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getAnalyticsOverview } from '../../../features/analytics/api/api'
import { PERIOD_LABELS, memberTotal, payrollOf, type AnalyticsOverview, type AnalyticsPeriod } from '../../../features/analytics/api/contracts'
import { downloadCsv } from '../../../features/analytics/export-csv'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { Card } from '../../../shared/components/card/card'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'

const PERIODS: AnalyticsPeriod[] = ['month', 'quarter', 'semester', 'year']
const fmt = new Intl.NumberFormat('fr-FR')
const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value} % vs. période précédente`
/** Suffixe de fichier : on doit savoir de quelle période vient un export. */
const SLUG: Record<AnalyticsPeriod, string> = { month: 'mois', quarter: 'trimestre', semester: 'semestre', year: 'annee' }

export function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  useEffect(() => {
    void getAnalyticsOverview().then(setOverview).catch(() => setError(true))
  }, [retryKey])

  /** Le filtre gouverne TOUT l'écran : un seul instantané alimente les blocs. */
  const snapshot = overview?.periods[period]
  const max = useMemo(() => Math.max(1, ...(snapshot?.series.points.map((point) => point.value) ?? [1])), [snapshot])

  /** Du plus au moins productif : le bas de la liste appelle une décision. */
  const agents = useMemo(() => {
    if (!snapshot) return []
    return [...snapshot.perAgent].sort((left, right) => right.tasksDone - left.tasksDone)
  }, [snapshot])
  const members = useMemo(() => {
    if (!snapshot) return []
    return [...snapshot.perMember].sort((left, right) => memberTotal(right) - memberTotal(left))
  }, [snapshot])
  const connectors = useMemo(() => {
    if (!snapshot) return []
    return [...snapshot.connectors].sort((left, right) => right.items - left.items)
  }, [snapshot])

  const taskMax = useMemo(() => Math.max(1, ...agents.map((agent) => agent.tasksDone + agent.tasksRunning)), [agents])
  const itemMax = useMemo(() => Math.max(1, ...connectors.map((connector) => connector.items)), [connectors])
  const formatMax = useMemo(() => Math.max(1, ...(snapshot?.resources.byFormat.map((entry) => entry.count) ?? [1])), [snapshot])
  const payroll = snapshot ? payrollOf(snapshot.perAgent) : 0
  const activeSeats = members.filter((member) => member.active).length

  /** Les quatre exports. Un seul endroit, en fin d'écran, pour tout emporter. */
  const exports = snapshot ? [
    {
      key: 'experts',
      label: 'Experts IA',
      detail: 'Salaire, tâches terminées, tâches en cours, livrables',
      run: () => downloadCsv(`experts-${SLUG[period]}.csv`, [
        ['Expert', 'Salaire mensuel (F CFA)', 'Tâches terminées', 'Tâches en cours', 'Livrables'],
        ...agents.map((agent) => [agent.name, agent.monthlySalary, agent.tasksDone, agent.tasksRunning, agent.deliverables]),
      ]),
    },
    {
      key: 'membres',
      label: 'Membres',
      detail: 'Tâches, ressources, livrables, connecteurs, dernière connexion',
      run: () => downloadCsv(`membres-${SLUG[period]}.csv`, [
        ['Membre', 'Rôle', 'Tâches', 'Ressources', 'Livrables', 'Connecteurs', 'Actif', 'Dernière connexion'],
        ...members.map((member) => [
          member.name,
          member.role,
          member.tasks,
          member.resources,
          member.deliverables,
          member.connectors,
          member.active ? 'oui' : 'non',
          member.lastSeenAt ? day.format(new Date(member.lastSeenAt)) : 'jamais',
        ]),
      ]),
    },
    {
      key: 'connecteurs',
      label: 'Connecteurs',
      detail: 'État et éléments consultés par les experts',
      run: () => downloadCsv(`connecteurs-${SLUG[period]}.csv`, [
        ['Connecteur', 'État', 'Éléments consultés'],
        ...connectors.map((connector) => [connector.name, connector.connected ? 'lié' : 'non lié', connector.items]),
      ]),
    },
    {
      key: 'ressources',
      label: 'Ressources et livrables',
      detail: 'Volumes fournis, produits, partagés, et formats',
      run: () => downloadCsv(`ressources-${SLUG[period]}.csv`, [
        ['Mesure', 'Valeur'],
        ['Documents fournis', snapshot.resources.inputs],
        ['Livrables produits', snapshot.resources.deliverables],
        ['Pièces partagées', snapshot.resources.shared],
        [],
        ['Format', 'Pièces'],
        ...snapshot.resources.byFormat.map((entry) => [entry.format, entry.count]),
      ]),
    },
  ] : []

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="L'activité de vos employés IA et de votre équipe, sur la période choisie."
        action={(
          <div className="period-tabs">
            {PERIODS.map((key) => (
              <button key={key} type="button" className={period === key ? 'is-active' : ''} onClick={() => setPeriod(key)}>
                {PERIOD_LABELS[key]}
              </button>
            ))}
          </div>
        )}
      />
      <PageBody>
        {error && <LoadError onRetry={() => { setError(false); setRetryKey((key) => key + 1) }} />}
        {!error && overview && snapshot && (
          <>
            <div className="analytics-stats">
              <Card>
                <small>Masse salariale IA</small>
                <strong>{money.format(payroll)} F</strong>
                <em>par mois · {overview.headcount} experts</em>
              </Card>
              <Card>
                <small>Tâches terminées</small>
                <strong>{fmt.format(snapshot.tasksDone)}</strong>
                <em>{signed(snapshot.tasksDelta)}</em>
              </Card>
              <Card>
                <small>Livrables produits</small>
                <strong>{fmt.format(snapshot.deliverables)}</strong>
                <em>{signed(snapshot.deliverablesDelta)}</em>
              </Card>
              <Card>
                <small>Comptes actifs</small>
                <strong>{fmt.format(activeSeats)}</strong>
                <em>sur {overview.seats} comptes ouverts</em>
              </Card>
            </div>

            <div className="analytics-main">
              <Card className="chart-card">
                <div className="chart-head"><h2>Tâches terminées</h2><span>{snapshot.series.sub}</span></div>
                <div className="bar-chart">
                  {snapshot.series.points.map((point, index) => (
                    <div key={point.label}>
                      <span style={{ height: `${Math.max(6, (point.value / max) * 100)}%`, background: index === snapshot.series.points.length - 1 ? 'var(--primary)' : 'var(--purple-200, #c5c4ff)' }} />
                      <small>{point.label}</small>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Deux teintes sur la même barre : ce qui est fini et ce qui
                  tourne encore. Une barre unique aurait mélangé les deux. */}
              <Card className="rank-card">
                <div className="chart-head"><h2>Tâches par expert</h2><span>terminées et en cours</span></div>
                <div className="load-chart">
                  {agents.map((agent) => (
                    <div key={agent.agentId} className="load-row">
                      <span className="load-name">{agent.name}</span>
                      <span className="load-track">
                        <span className="load-done" style={{ width: `${(agent.tasksDone / taskMax) * 100}%` }} />
                        <span className="load-running" style={{ width: `${(agent.tasksRunning / taskMax) * 100}%` }} />
                      </span>
                      <span className="load-value">{fmt.format(agent.tasksDone)}</span>
                    </div>
                  ))}
                </div>
                <div className="load-legend">
                  <span><i className="is-done" />Terminées</span>
                  <span><i className="is-running" />En cours</span>
                </div>
              </Card>
            </div>

            {/* Les humains de l'organisation : un siège ouvert et jamais
                utilisé se paie aussi. Sans cet écran, il ne se voit pas. */}
            <Card className="payroll-card">
              <div className="chart-head"><h2>Activité des membres</h2><span>{snapshot.series.sub}</span></div>
              <div className="member-metrics">
                {/* Un en-tete, sinon « 148 » ne dit pas de quoi il s'agit. */}
                {/* Trois mesures nommees plutot qu'un total flou : on sait ce
                    que compte chaque colonne. */}
                <div className="member-metric member-metric--head">
                  <span />
                  <span>Membre</span>
                  <span>Tâches</span>
                  <span>Ressources</span>
                  <span>Livrables</span>
                  <span>Connecteurs</span>
                  <span>Dernière connexion</span>
                </div>
                {members.map((member) => (
                  <div key={member.userId} className={member.active ? 'member-metric' : 'member-metric is-idle'}>
                    <span className="member-metric-face">{member.initials}</span>
                    <span className="member-metric-id">
                      <strong>{member.name}</strong>
                      <small>{member.role}</small>
                    </span>
                    <span className="member-metric-num">{fmt.format(member.tasks)}</span>
                    <span className="member-metric-num">{fmt.format(member.resources)}</span>
                    <span className="member-metric-num">{fmt.format(member.deliverables)}</span>
                    <span className="member-metric-num">{fmt.format(member.connectors)}</span>
                    <span className="member-metric-seen">
                      {member.lastSeenAt ? day.format(new Date(member.lastSeenAt)) : 'Jamais connecté'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="analytics-main">
              <Card className="rank-card">
                <div className="chart-head"><h2>Connecteurs</h2><span>éléments consultés par les experts</span></div>
                <div className="load-chart">
                  {connectors.map((connector) => (
                    <div key={connector.provider} className={connector.connected ? 'conn-row' : 'conn-row is-off'}>
                      <span className="conn-logo">
                        {CONNECTOR_LOGOS[connector.provider]
                          ? <img src={CONNECTOR_LOGOS[connector.provider]} alt="" />
                          : connector.name[0]}
                      </span>
                      <span className="load-name">{connector.name}</span>
                      <span className="load-track">
                        <span className="load-done" style={{ width: `${(connector.items / itemMax) * 100}%` }} />
                      </span>
                      <span className="load-value">{connector.connected ? fmt.format(connector.items) : 'non lié'}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rank-card">
                <div className="chart-head"><h2>Ressources et livrables</h2><span>{snapshot.series.sub}</span></div>
                <div className="res-counts">
                  <span><strong>{fmt.format(snapshot.resources.inputs)}</strong><small>Documents fournis</small></span>
                  <span><strong>{fmt.format(snapshot.resources.deliverables)}</strong><small>Livrables produits</small></span>
                  <span><strong>{fmt.format(snapshot.resources.shared)}</strong><small>Pièces partagées</small></span>
                </div>
                <div className="load-chart">
                  {snapshot.resources.byFormat.map((entry) => (
                    <div key={entry.format} className="load-row">
                      <span className="load-name">{entry.format}</span>
                      <span className="load-track">
                        <span className="load-done" style={{ width: `${(entry.count / formatMax) * 100}%` }} />
                      </span>
                      <span className="load-value">{fmt.format(entry.count)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* En dernier, et volontairement : on emporte les chiffres apres
                les avoir lus, pas avant. */}
            <Card className="payroll-card">
              <div className="chart-head"><h2>Télécharger les métriques</h2><span>{PERIOD_LABELS[period].toLocaleLowerCase('fr')} en cours, au format CSV</span></div>
              <div className="export-grid">
                {exports.map((entry) => (
                  <button key={entry.key} type="button" className="export-tile" onClick={entry.run}>
                    <span className="export-mark"><Download size={16} /></span>
                    <span><strong>{entry.label}</strong><small>{entry.detail}</small></span>
                  </button>
                ))}
              </div>
            </Card>
          </>
        )}
      </PageBody>
    </>
  )
}
