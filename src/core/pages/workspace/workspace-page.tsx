import { ArrowRight, Image as ImageIcon, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { listMarketplaceAgents } from '../../../features/agents/api/api'
import type { AgentSummary } from '../../../features/agents/api/contracts'
import { listConversations } from '../../../features/conversations/api/api'
import { Card } from '../../../shared/components/card/card'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'
import { ONBOARDING_SEEN_KEY } from '../onboarding/onboarding-page'

const normalize = (value: string) => value.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '')

export function WorkspacePage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [conversationCount, setConversationCount] = useState(0)
  const [marketplace, setMarketplace] = useState<AgentSummary[]>([])
  const [need, setNeed] = useState('')
  const [metier, setMetier] = useState('all')
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const hasConversations = conversationCount > 0

  useEffect(() => {
    void listMarketplaceAgents().then(setMarketplace).catch(() => setMarketplace([]))
  }, [retryKey])

  // Le nombre de conversations ne sert qu'à savoir si le membre a déjà démarré
  // (redirection vers la présentation à la première visite).
  useEffect(() => {
    void listConversations()
      .then((items) => { setConversationCount(items.length); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [retryKey])

  // Grands groupes de métier présents au catalogue, avec leur nombre d'experts.
  // Un filtre rassemble ainsi plusieurs experts, au lieu d'un seul par métier.
  const chips = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const agent of marketplace) {
      const group = agent.group
      if (!group) continue
      const entry = counts.get(group.key) ?? { name: group.name, count: 0 }
      entry.count += 1
      counts.set(group.key, entry)
    }
    return [
      { id: 'all', name: 'Tous les métiers', count: marketplace.length },
      ...[...counts].map(([key, entry]) => ({ id: key, name: entry.name, count: entry.count })),
    ]
  }, [marketplace])

  // Filtres cumulés : groupe choisi + besoin décrit (nom, métier, accroche).
  const shown = useMemo(() => {
    const query = normalize(need.trim())
    return marketplace.filter((agent) => {
      const matchesMetier = metier === 'all' || agent.group?.key === metier
      const matchesQuery = !query || normalize(`${agent.name} ${agent.tags.join(' ')} ${agent.description}`).includes(query)
      return matchesMetier && matchesQuery
    })
  }, [marketplace, need, metier])

  // Session restaurée (rafraîchissement, nouvel onglet) : un membre sans aucune
  // conversation qui n'a pas encore vu la présentation y est conduit d'abord.
  if (status === 'ready' && !hasConversations && !sessionStorage.getItem(ONBOARDING_SEEN_KEY)) {
    return <Navigate to={paths.onboarding(workspaceId)} replace />
  }

  return (
    <div className="home-page">
      <header className="home-hero home-hero--recruit">
        <h1>Qui sera votre prochaine recrue ?</h1>
        <p>Décrivez votre besoin — ou parcourez les experts IA prêts à rejoindre votre équipe.</p>
        <form className="need-form" onSubmit={(event) => event.preventDefault()}>
          <input
            className="need-input"
            aria-label="Décrivez l'expert IA dont vous avez besoin"
            placeholder="Décrivez l'expert IA dont vous avez besoin…"
            value={need}
            onChange={(event) => setNeed(event.target.value)}
          />
          <button type="submit" className="need-go" aria-label="Rechercher"><ArrowRight size={19} /></button>
        </form>
      </header>

      <div className="home-body">
        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}

        {marketplace.length > 0 && (
          <section className="market-section">
            <div className="market-label">{need.trim() ? 'Experts IA correspondants' : "Choisissez un expert prêt à l'emploi"}</div>

            <div className="chip-row">
              {chips.map((chip) => (
                <button key={chip.id} type="button" className={metier === chip.id ? 'chip is-active' : 'chip'} onClick={() => setMetier(chip.id)}>
                  {chip.name}
                  <span className="chip-count">{chip.count}</span>
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <div className="agents-empty">
                <strong>Aucun expert IA ne correspond</strong>
                <span>Reformulez votre besoin, ou choisissez un autre métier.</span>
              </div>
            ) : (
              <div className="agent-grid">
                {shown.map((agent) => (
                  <Card key={agent.id} interactive className="agent-card" onClick={() => navigate(paths.marketplaceAgent(agent.id, workspaceId))}>
                    <div className="agent-card-photo">
                      {agent.avatarUrl
                        ? <img className="agent-card-cover" src={agent.avatarUrl} alt="" />
                        : <div className="agent-card-photo-empty"><ImageIcon size={30} strokeWidth={1.6} /><span className="agent-card-photo-label">Photo</span></div>}
                      <div className="agent-card-overlay">
                        <h2>{agent.name}</h2>
                        {agent.tags[0] && <span className="agent-card-metier">{agent.tags[0]}</span>}
                        <p>{agent.description}</p>
                        <span className="market-recruit"><UserPlus size={15} /> Recruter {agent.name}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
