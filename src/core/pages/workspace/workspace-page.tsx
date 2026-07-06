import { ArrowRight, Grid2X2, MessageSquareText, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { listAgents } from '../../../shared/api/agent/api'
import type { AgentSummary } from '../../../shared/api/agent/contracts'
import { listConversations } from '../../../shared/api/conversation/api'
import type { ConversationSummary } from '../../../shared/api/conversation/contracts'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { Button } from '../../../shared/components/button/button'
import { Card } from '../../../shared/components/card/card'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { useSession } from '../../providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'
import { ONBOARDING_SEEN_KEY } from '../onboarding/onboarding-page'

export function WorkspacePage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const { session } = useSession()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [agentIcons, setAgentIcons] = useState<Record<string, string>>({})
  const [recentAgents, setRecentAgents] = useState<AgentSummary[]>([])
  const [conversationCount, setConversationCount] = useState(0)
  const [agentCount, setAgentCount] = useState(0)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const hasConversations = conversationCount > 0

  useEffect(() => {
    void Promise.all([listConversations(), listAgents()]).then(([conversationData, agents]) => {
      setConversations(conversationData.slice(0, 3))
      setConversationCount(conversationData.length)
      setAgentIcons(Object.fromEntries(agents.map((agent) => [agent.id, agent.icon])))
      setAgentCount(agents.length)
      const recentIds: string[] = []
      conversationData.forEach((conversation) => { if (!recentIds.includes(conversation.agentId)) recentIds.push(conversation.agentId) })
      const byId = new Map(agents.map((agent) => [agent.id, agent]))
      setRecentAgents(recentIds.map((id) => byId.get(id)).filter((agent): agent is AgentSummary => Boolean(agent)).slice(0, 4))
      setStatus('ready')
    }).catch(() => setStatus('error'))
  }, [retryKey])

  const firstName = session?.user.name.split(' ')[0]
  const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  // Session restaurée (rafraîchissement, nouvel onglet) : un membre sans aucune
  // conversation qui n'a pas encore vu la présentation y est conduit d'abord.
  if (status === 'ready' && !hasConversations && !sessionStorage.getItem(ONBOARDING_SEEN_KEY)) {
    return <Navigate to={paths.onboarding(workspaceId)} replace />
  }

  return (
    <div className="home-page">
      <header className="home-hero"><span className="eyebrow">{date}</span><h1>Bonjour, {firstName}</h1><p>Reprenez votre travail, ou lancez un agent pour une nouvelle tâche.</p></header>
      <div className="home-body">
        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}
        {status === 'ready' && !hasConversations && !bannerDismissed && <section className="welcome-banner"><span className="welcome-icon"><Sparkles size={22} /></span><div><h2>Lancez votre première<br />conversation</h2><p>Choisissez un agent, décrivez votre besoin, et obtenez un premier résultat en quelques secondes.</p></div><Button variant="secondary" onClick={() => navigate(paths.agents(workspaceId))} trailingIcon={<ArrowRight size={18} />}>Découvrir les agents</Button><button className="banner-close" type="button" onClick={() => setBannerDismissed(true)} aria-label="Fermer"><X size={18} /></button></section>}
        {hasConversations && <section className="metric-grid">
          <Card className="metric-card"><span><MessageSquareText size={21} /></span><strong>{conversationCount}</strong><small>Vos<br />conversations</small></Card>
          <Card className="metric-card"><span><Grid2X2 size={21} /></span><strong>{agentCount}</strong><small>Agents<br />disponibles</small></Card>
          <Card className="metric-card"><span><Sparkles size={21} /></span><strong>≈ {conversationCount} h</strong><small>Temps estimé<br />gagné</small></Card>
        </section>}
        {hasConversations && <section className="resume-section"><div className="section-heading"><h2>Reprendre</h2><button type="button" onClick={() => navigate(paths.conversations(workspaceId))}>Toutes les conversations <ArrowRight size={16} /></button></div><div className="conversation-preview-grid">{conversations.map((conversation) => <Card key={conversation.id} interactive className="conversation-preview" onClick={() => navigate(paths.conversation(conversation.agentId, conversation.id, workspaceId))}><span className="agent-icon"><AgentIcon name={agentIcons[conversation.agentId] ?? 'sparkles'} size={18} /></span><div><h3>{conversation.title}</h3><p>{conversation.preview}</p><small>{conversation.time}</small></div></Card>)}</div></section>}
        {recentAgents.length > 0 && <section className="resume-section"><div className="section-heading"><h2>Agents récents</h2><button type="button" onClick={() => navigate(paths.agents(workspaceId))}>Tous les agents <ArrowRight size={16} /></button></div><div className="agent-grid">{recentAgents.map((agent) => <Card key={agent.id} interactive className="agent-card" onClick={() => navigate(paths.agent(agent.id, workspaceId))}><span className="agent-icon agent-icon--large"><AgentIcon name={agent.icon} size={22} /></span><h2>{agent.name}</h2><p>{agent.description}</p></Card>)}</div></section>}
      </div>
    </div>
  )
}
