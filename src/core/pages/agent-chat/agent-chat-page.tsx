import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { getAgent } from '../../../features/agents/api/api'
import type { AgentDetail } from '../../../features/agents/api/contracts'
import { ExpertChat } from '../../../features/conversations/components/expert-chat'
import { AgentAvatar } from '../../../shared/components/agent-avatar/agent-avatar'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

/**
 * Conversation ouverte depuis la liste des conversations. L'échange lui-même est
 * le composant partagé `ExpertChat` — le même que dans l'espace de l'expert.
 */
export function AgentChatPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID, agentId = '', conversationId } = useParams()
  const [agent, setAgent] = useState<AgentDetail | null>(null)

  // Agent retiré au membre (403) ou inconnu (404) → retour au catalogue.
  useEffect(() => {
    if (!agentId) return
    void getAgent(agentId).then(setAgent).catch(() => navigate(paths.agents(workspaceId), { replace: true }))
  }, [agentId, navigate, workspaceId])

  if (!agent) return <div className="route-loader">Chargement de la conversation…</div>

  return (
    <div className="expert-focus">
      <div className="chat-page">
        <div className="chat-shell">
          <header className="chat-header">
            <button type="button" className="chat-back" onClick={() => navigate(paths.agent(agent.id, workspaceId))}><ArrowLeft size={16} /> Retour à l'expert</button>
            <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} className="chat-header-av" />
            <div><h1>{agent.name}</h1>{agent.tags[0] && <p>{agent.tags[0]}</p>}</div>
          </header>
          <ExpertChat
            agent={agent}
            conversationId={conversationId}
            onCreated={(created) => navigate(paths.conversation(agent.id, created.id, workspaceId), { replace: true })}
          />
        </div>
      </div>
    </div>
  )
}
