import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents, listMetiers } from '../../../shared/api/agent/api'
import type { AgentSummary, Metier } from '../../../shared/api/agent/contracts'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { Card } from '../../../shared/components/card/card'
import { Filter } from '../../../shared/components/filter/filter'
import { Input } from '../../../shared/components/input/input'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

type Sort = 'recent' | 'az'

export function AgentsPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [metiers, setMetiers] = useState<Metier[]>([])
  const [accessibleAgents, setAccessibleAgents] = useState<AgentSummary[]>([])
  const [metier, setMetier] = useState('direction')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [agents, setAgents] = useState<AgentSummary[]>([])

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    void Promise.all([listMetiers(), listAgents()]).then(([groups, all]) => { setMetiers(groups); setAccessibleAgents(all) }).catch(() => setStatus('error'))
  }, [retryKey])

  const searching = query.trim().length > 0
  useEffect(() => {
    void listAgents(searching ? { q: query.trim() } : { metier }).then((items) => { setAgents(items); setStatus('ready') }).catch(() => setStatus('error'))
  }, [metier, searching, query, retryKey])

  // Compteurs calculés sur les agents ACCESSIBLES au membre (pas la carte statique métier→agents).
  const chips = useMemo(() => {
    const accessibleIds = new Set(accessibleAgents.map((agent) => agent.id))
    return [
      { id: 'all', name: 'Tous les agents', count: accessibleAgents.length },
      ...metiers.map((item) => ({ id: item.id, name: item.name, count: item.agentIds.filter((id) => accessibleIds.has(id)).length })),
    ]
  }, [metiers, accessibleAgents])

  const displayed = useMemo(() => {
    const list = [...agents]
    if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    return list
  }, [agents, sort])

  const title = searching ? 'Résultats' : metier === 'all' ? 'Tous les agents' : metiers.find((item) => item.id === metier)?.name ?? ''

  return (
    <div className="agents-page">
      <header className="agents-hero">
        <h1>Bonjour, Aïcha</h1>
        <p>Choisissez un métier pour accéder à ses agents, ou recherchez directement un agent.</p>
        <form onSubmit={(event) => event.preventDefault()}>
          <Input aria-label="Rechercher un agent" placeholder="Rechercher un agent ou décrire votre besoin…" value={query} onChange={(event) => setQuery(event.target.value)} icon={<Search size={19} />} action={<button className="search-button" type="submit"><Search size={16} /> Rechercher</button>} />
        </form>
      </header>
      <div className="agents-body">
        {!searching && (
          <div className="chip-row">
            {chips.map((chip) => (
              <button key={chip.id} type="button" className={metier === chip.id ? 'chip is-active' : 'chip'} onClick={() => setMetier(chip.id)}>
                {chip.name}
                <span className="chip-count">{chip.count}</span>
              </button>
            ))}
          </div>
        )}
        <div className="agents-toolbar">
          <span>{title} <em>· {displayed.length} agent{displayed.length > 1 ? 's' : ''}</em></span>
          <div className="agents-toolbar-actions">
            {searching && <button type="button" className="link-button" onClick={() => setQuery('')}>Effacer la recherche</button>}
            <Filter label="Trier les agents" value={sort} onChange={(value) => setSort(value as Sort)} options={[{ value: 'recent', label: 'Nouveau' }, { value: 'az', label: 'A → Z' }]} />
          </div>
        </div>
        {status === 'error' ? (
          <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />
        ) : status === 'ready' && displayed.length === 0 ? (
          <div className="agents-empty"><strong>Aucun agent ne correspond</strong><span>Ajustez votre recherche ou choisissez un autre métier.</span></div>
        ) : (
          <div className="agent-grid">
            {displayed.map((agent) => (
              <Card key={agent.id} interactive className="agent-card" onClick={() => navigate(paths.agent(agent.id, workspaceId))}>
                <span className="agent-icon agent-icon--large"><AgentIcon name={agent.icon} size={25} /></span>
                <h2>{agent.name}</h2>
                <p>{agent.description}</p>
                <div>{agent.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
