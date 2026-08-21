import { ChevronDown, Image as ImageIcon, UserPlus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents, listMetiers } from '../../../features/agents/api/api'
import type { AgentSummary, Metier } from '../../../features/agents/api/contracts'
import { Card } from '../../../shared/components/card/card'
import { Filter } from '../../../shared/components/filter/filter'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

type Sort = 'recent' | 'az'

/** Activités montrées sur une carte. */
const CARD_ACTIVITIES = 3

/**
 * Les experts IA de l'équipe. Le recrutement se fait depuis l'accueil
 * (marketplace) : cette page ne montre que les experts déjà rattachés.
 */
export function AgentsPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [metiers, setMetiers] = useState<Metier[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [metier, setMetier] = useState('all')
  /** Expert choisi dans la liste des noms. Vide = tous. */
  const [pickedAgent, setPickedAgent] = useState('')
  const [namesOpen, setNamesOpen] = useState(false)
  const [sort, setSort] = useState<Sort>('recent')
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    void Promise.all([listMetiers(), listAgents()])
      .then(([groups, all]) => { setMetiers(groups); setAgents(all); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [retryKey])

  // Compteurs calculés sur les experts réellement accessibles au membre.
  const chips = useMemo(() => {
    const ids = new Set(agents.map((agent) => agent.id))
    return [
      { id: 'all', name: 'Tous les agents', count: agents.length },
      ...metiers
        .map((item) => ({ id: item.id, name: item.name, count: item.agentIds.filter((id) => ids.has(id)).length }))
        .filter((chip) => chip.count > 0),
    ]
  }, [metiers, agents])

  const displayed = useMemo(() => {
    const byId = new Map(metiers.map((item) => [item.id, new Set(item.agentIds)]))
    const list = agents.filter((agent) => (
      (metier === 'all' || byId.get(metier)?.has(agent.id))
      && (!pickedAgent || agent.id === pickedAgent)
    ))
    if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    return list
  }, [agents, metiers, metier, sort, pickedAgent])

  return (
    <div className="agents-page">
      <header className="agents-hero">
        <h1>Mes experts IA</h1>
        <p>Les experts IA de votre équipe. Ouvrez l'espace de l'un d'eux pour lui confier une tâche.</p>
      </header>
      <div className="agents-body">
        <div className="chip-row">
          {/* « Tous les agents », le nom, puis les metiers — la meme rangee que
              sur l'accueil, pour qu'on ne reapprenne rien d'un ecran a l'autre. */}
          {chips.slice(0, 1).map((chip) => (
            <button key={chip.id} type="button" className={metier === chip.id ? 'chip is-active' : 'chip'} onClick={() => setMetier(chip.id)}>
              {chip.name}
              <span className="chip-count">{chip.count}</span>
            </button>
          ))}
          <span className="name-pick">
            {pickedAgent ? (
              <span className="chip is-active">
                {agents.find((agent) => agent.id === pickedAgent)?.name}
                <button type="button" aria-label="Effacer le nom choisi" onClick={() => setPickedAgent('')}><X size={13} /></button>
              </span>
            ) : (
              <button type="button" className="chip" onClick={() => setNamesOpen((open) => !open)}>
                Nom de l’agent<ChevronDown size={14} />
              </button>
            )}
            {namesOpen && !pickedAgent && (
              <>
                <span className="name-veil" onClick={() => setNamesOpen(false)} />
                <span className="name-menu">
                  {[...agents].sort((left, right) => left.name.localeCompare(right.name, 'fr')).map((agent) => (
                    <button key={agent.id} type="button" onClick={() => { setPickedAgent(agent.id); setNamesOpen(false) }}>
                      {agent.name}<small>{agent.tags[0] ?? ''}</small>
                    </button>
                  ))}
                </span>
              </>
            )}
          </span>
          {chips.slice(1).map((chip) => (
            <button key={chip.id} type="button" className={metier === chip.id ? 'chip is-active' : 'chip'} onClick={() => setMetier(chip.id)}>
              {chip.name}
              <span className="chip-count">{chip.count}</span>
            </button>
          ))}
        </div>

        <div className="agents-toolbar">
          <div className="agents-toolbar-actions">
            <Filter label="Trier les experts IA" value={sort} onChange={(value) => setSort(value as Sort)} options={[{ value: 'recent', label: 'Nouveau' }, { value: 'az', label: 'A → Z' }]} />
          </div>
        </div>

        {status === 'error' ? (
          <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />
        ) : status === 'ready' && displayed.length === 0 ? (
          <div className="agents-empty">
            <strong>Aucun expert IA dans ce métier</strong>
            <span>Recrutez un expert depuis le catalogue, ou choisissez un autre métier.</span>
          </div>
        ) : (
          <div className="agent-grid">
            {displayed.map((agent) => (
              <Card key={agent.id} interactive className="agent-card" onClick={() => navigate(paths.agent(agent.id, workspaceId))}>
                <div className="agent-card-photo">
                  {/* Rien pour ceux qui sont hors service : la mention ne
                      s'affiche que lorsqu'il y a quelque chose a dire. */}
                  {agent.active !== false && (
                    <span className="agent-card-state"><i aria-hidden="true" />En service</span>
                  )}
                  {agent.avatarUrl
                    ? <img className="agent-card-cover" src={agent.avatarUrl} alt="" />
                    : <div className="agent-card-photo-empty"><ImageIcon size={30} strokeWidth={1.6} /><span className="agent-card-photo-label">Photo</span></div>}
                  <div className="agent-card-overlay">
                    <h2>{agent.name}</h2>
                    {agent.tags[0] && <span className="agent-card-metier">{agent.tags[0]}</span>}
                    {/* Les dernieres taches, pas des compteurs : un intitule
                        dit ce que l'expert fait, « 2 en cours » ne dit que
                        combien. */}
                    {agent.activity && agent.activity.recent.length > 0 ? (
                      <ul className="agent-card-recent">
                        {agent.activity.recent.slice(0, CARD_ACTIVITIES).map((task) => (
                          <li key={task.title} className={`is-${task.status}`}>
                            <i aria-hidden="true" />
                            <span className="agent-card-task">{task.title}</span>
                            {task.time && <em>{task.time}</em>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{agent.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {/* Dernière tuile : le catalogue ne se retrouve pas dans un menu,
                il se propose là où on constate qu'il manque quelqu'un. */}
            <button type="button" className="agent-card-add" onClick={() => navigate(paths.workspace(workspaceId))}>
              <span className="agent-card-add-mark"><UserPlus size={22} /></span>
              <strong>Agrandir l’équipe</strong>
              <span>Parcourir le catalogue des experts</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
