import { ArrowLeft, Check, ChevronRight, Clock, Plus, SlidersHorizontal, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { getAgent } from '../../../shared/api/agent/api'
import type { AgentDetail } from '../../../shared/api/agent/contracts'
import { listConversations } from '../../../shared/api/conversation/api'
import type { ConversationSummary } from '../../../shared/api/conversation/contracts'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { Button } from '../../../shared/components/button/button'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

export function AgentDetailPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID, agentId = '' } = useParams()
  const [agent, setAgent] = useState<AgentDetail | null>(null)
  const [resume, setResume] = useState<ConversationSummary[]>([])

  // Agent retiré au membre (403) ou inconnu (404) → retour au catalogue.
  useEffect(() => {
    if (!agentId) return
    void getAgent(agentId).then(setAgent).catch(() => navigate(paths.agents(workspaceId), { replace: true }))
  }, [agentId, navigate, workspaceId])
  useEffect(() => { if (agentId) void listConversations({ agent: agentId }).then((items) => setResume(items.slice(0, 3))) }, [agentId])

  if (!agent) return <div className="route-loader">Chargement de l'agent…</div>

  return (
    <div className="agent-detail-page">
      <div className="agent-detail-breadcrumb">
        <Button variant="tertiary" size="small" leadingIcon={<ArrowLeft size={17} />} onClick={() => navigate(paths.agents(workspaceId))}>Tous les agents</Button>
        <span className="breadcrumb"><button type="button" onClick={() => navigate(paths.agents(workspaceId))}>Agents</button><ChevronRight size={15} /><strong>{agent.name}</strong></span>
      </div>

      <div className="agent-detail-main">
        <div className="agent-detail-copy">
          <div className="agent-detail-head">
            <span className="agent-icon agent-icon--xl"><AgentIcon name={agent.icon} size={31} /></span>
            <div>
              <h1>{agent.name}</h1>
              <div className="tag-row">{agent.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </div>
          </div>
          <p className="agent-long">{agent.long}</p>

          <h2>Ce que fait cet agent</h2>
          <ul className="agent-abilities">{agent.abilities.map((ability) => <li key={ability}><Check size={20} />{ability}</li>)}</ul>

          <h2>Ce qu'il produit</h2>
          <div className="agent-produces">
            {agent.produces.map((product) => (
              <div key={product.title} className="produce-card"><span className="produce-format">{product.format}</span><p>{product.title}</p></div>
            ))}
          </div>

          <Button size="large" leadingIcon={<Plus size={19} />} onClick={() => navigate(paths.newConversation(agent.id, workspaceId))}>Démarrer une conversation</Button>
        </div>

        <aside className="agent-detail-side">
          <div className="agent-needs">
            <div className="agent-needs-head"><SlidersHorizontal size={17} /><span>Ce dont il a besoin</span></div>
            <ul>{agent.inputs.map((input) => <li key={input}><span className="diamond">◆</span>{input}</li>)}</ul>
            <div className="agent-needs-row"><Clock size={16} /><span>Délai estimé</span><strong>{agent.delay}</strong></div>
            <div className="agent-needs-users">
              <div className="agent-needs-head"><Users size={16} /><span>Utilisé par</span></div>
              <div className="user-chips">{agent.users.map((user) => <span key={user}>{user}</span>)}</div>
            </div>
          </div>

          {resume.length > 0 && (
            <div className="agent-resume">
              <h3>Reprendre</h3>
              <div>
                {resume.map((conversation) => (
                  <button type="button" key={conversation.id} className="agent-resume-row" onClick={() => navigate(paths.conversation(agent.id, conversation.id, workspaceId))}>
                    <strong>{conversation.title}</strong>
                    <small>{conversation.preview}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
