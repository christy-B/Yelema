import { MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents } from '../../../shared/api/agent/api'
import type { AgentSummary } from '../../../shared/api/agent/contracts'
import { deleteConversation, listConversations, renameConversation } from '../../../shared/api/conversation/api'
import type { ConversationSummary } from '../../../shared/api/conversation/contracts'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { Button } from '../../../shared/components/button/button'
import { Filter } from '../../../shared/components/filter/filter'
import { Input } from '../../../shared/components/input/input'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

export function ConversationsPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [query, setQuery] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  const load = () => void listConversations().then(setConversations)
  useEffect(() => {
    void Promise.all([listConversations(), listAgents()])
      .then(([items, agentItems]) => { setConversations(items); setAgents(agentItems); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [retryKey])

  const agentOptions = useMemo(() => [
    { value: '', label: 'Tous les agents' },
    ...agents.filter((agent) => conversations.some((item) => item.agentId === agent.id)).map((agent) => ({ value: agent.id, label: agent.name })),
  ], [agents, conversations])
  const filtered = useMemo(() => conversations.filter((conversation) =>
    (!agentFilter || conversation.agentId === agentFilter) &&
    `${conversation.title} ${conversation.preview}`.toLowerCase().includes(query.toLowerCase())
  ), [agentFilter, conversations, query])
  const groups = agents.map((agent) => ({ agent, items: filtered.filter((item) => item.agentId === agent.id) })).filter((group) => group.items.length)

  const startRename = (conversation: ConversationSummary) => { setMenuId(null); setRenameId(conversation.id); setRenameValue(conversation.title) }
  const commitRename = async () => { if (renameId && renameValue.trim()) { await renameConversation(renameId, renameValue.trim()); load() } setRenameId(null) }
  const remove = async (id: string) => { setMenuId(null); await deleteConversation(id); load() }

  return (
    <>
      <PageHeader title="Conversations" subtitle="Vos échanges sont regroupés par agent — c'est dans un agent que vivent ses conversations." />
      <PageBody>
        <div className="list-toolbar">
          <Input aria-label="Rechercher une conversation" placeholder="Rechercher une conversation…" value={query} onChange={(event) => setQuery(event.target.value)} icon={<Search size={17} />} />
          <Filter label="Filtrer par agent" value={agentFilter} onChange={setAgentFilter} options={agentOptions} />
        </div>
        {status === 'error' ? (
          <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />
        ) : status === 'ready' && groups.length === 0 ? (
          <div className="agents-empty"><strong>Aucune conversation</strong><span>Aucun résultat pour ces filtres, ou ouvrez un agent pour démarrer.</span></div>
        ) : (
          <div className="conversation-groups">
            {groups.map(({ agent, items }) => (
              <section key={agent.id}>
                <header><span className="agent-icon"><AgentIcon name={agent.icon} size={17} /></span><h2>{agent.name}</h2><small>· {items.length} conversation{items.length > 1 ? 's' : ''}</small></header>
                <div>
                  {items.map((conversation) => (
                    <article className="conversation-row" key={conversation.id}>
                      {renameId === conversation.id ? (
                        <>
                          <input className="rename-input" value={renameValue} autoFocus onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void commitRename(); if (event.key === 'Escape') setRenameId(null) }} />
                          <Button size="small" onClick={() => void commitRename()}>Enregistrer</Button>
                          <Button variant="tertiary" size="small" onClick={() => setRenameId(null)}>Annuler</Button>
                        </>
                      ) : (
                        <>
                          <div><h3>{conversation.title}</h3><p>{conversation.preview}</p><small>{conversation.time}</small></div>
                          <Button variant="secondary" size="small" onClick={() => navigate(paths.conversation(agent.id, conversation.id, workspaceId))}>Reprendre</Button>
                          <div className="file-actions">
                            <button type="button" className="row-menu-trigger" aria-label="Plus d'actions" onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)}><MoreHorizontal size={18} /></button>
                            {menuId === conversation.id && (
                              <div className="row-menu">
                                <button type="button" className="row-menu-item" onClick={() => startRename(conversation)}><Pencil size={15} /> Renommer</button>
                                <button type="button" className="row-menu-danger" onClick={() => void remove(conversation.id)}><Trash2 size={15} /> Supprimer</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
