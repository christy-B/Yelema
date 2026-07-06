import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents, listMetiers } from '../../../shared/api/agent/api'
import type { AgentSummary, Metier } from '../../../shared/api/agent/contracts'
import { getMember, listCapabilities, setMemberCapabilities, setMemberExcludedAgents } from '../../../shared/api/members/api'
import type { CapabilityDefinition, Member } from '../../../shared/api/members/contracts'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { Button } from '../../../shared/components/button/button'
import { Card } from '../../../shared/components/card/card'
import { Filter } from '../../../shared/components/filter/filter'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

export function MemberDetailPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID, memberId = '' } = useParams()
  const [member, setMember] = useState<Member | null>(null)
  const [capabilities, setCapabilities] = useState<CapabilityDefinition[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [metiers, setMetiers] = useState<Metier[]>([])

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    void Promise.all([getMember(memberId), listCapabilities(), listAgents(), listMetiers()]).then(([m, caps, agentItems, metierItems]) => {
      setMember(m); setCapabilities(caps); setAgents(agentItems); setMetiers(metierItems); setStatus('ready')
    }).catch(() => setStatus('error'))
  }, [memberId, retryKey])

  if (status === 'error') return <div className="member-detail-page"><LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} /></div>
  if (!member) return <div className="route-loader">Chargement du membre…</div>

  const hasAgent = (id: string) => !member.excludedAgentIds.includes(id)

  const toggleCapability = async (key: string) => {
    const next = member.capabilities.includes(key) ? member.capabilities.filter((item) => item !== key) : [...member.capabilities, key]
    setMember(await setMemberCapabilities(member.id, next))
  }
  const toggleAgent = async (id: string) => {
    const next = member.excludedAgentIds.includes(id) ? member.excludedAgentIds.filter((item) => item !== id) : [...member.excludedAgentIds, id]
    setMember(await setMemberExcludedAgents(member.id, next))
  }
  const removeMetier = async (metierId: string) => {
    if (!metierId) return
    const ids = metiers.find((item) => item.id === metierId)?.agentIds ?? []
    const next = Array.from(new Set([...member.excludedAgentIds, ...ids]))
    setMember(await setMemberExcludedAgents(member.id, next))
  }

  const accessCount = agents.length - member.excludedAgentIds.length

  return (
    <div className="member-detail-page">
      <div className="agent-detail-breadcrumb">
        <Button variant="tertiary" size="small" leadingIcon={<ArrowLeft size={17} />} onClick={() => navigate(paths.members(workspaceId))}>Membres</Button>
        <span className="breadcrumb"><button type="button" onClick={() => navigate(paths.members(workspaceId))}>Membres</button><ChevronRight size={15} /><strong>{member.name}</strong></span>
      </div>

      <div className="member-detail-head">
        <span className="member-avatar member-avatar--xl" style={{ background: member.color }}>{member.initials}</span>
        <div><h1>{member.name}</h1><p>{member.status === 'pending' ? 'E-mail envoyé' : member.email}</p></div>
      </div>

      <div className="member-detail-grid">
        <Card>
          <div className="settings-head"><h2>Capacités</h2></div>
          <p className="settings-hint">Activez ce que ce membre peut consulter ou modifier.</p>
          {capabilities.map((capability) => {
            const active = member.capabilities.includes(capability.key)
            return (
              <button type="button" className="setting-toggle" key={capability.key} onClick={() => void toggleCapability(capability.key)}>
                <span>{capability.label}</span>
                <i className={active ? 'switch is-on' : 'switch'} aria-label={active ? 'Autorisé' : 'Non autorisé'}><b /></i>
              </button>
            )
          })}
        </Card>

        <Card>
          <div className="settings-head"><h2>Agents accessibles</h2><span>{accessCount} / {agents.length}</span></div>
          <p className="settings-hint">Par défaut, accès à tous les agents. Décochez pour retirer.</p>
          <Filter label="Retirer les agents d'un métier" value="" onChange={(value) => void removeMetier(value)} options={[{ value: '', label: "Retirer les agents d'un métier…" }, ...metiers.map((metier) => ({ value: metier.id, label: metier.name }))]} />
          <div className="member-agent-list">
            {agents.map((agent) => (
              <button type="button" className="setting-toggle" key={agent.id} onClick={() => void toggleAgent(agent.id)}>
                <span className="member-agent-name"><span className="agent-icon"><AgentIcon name={agent.icon} size={16} /></span>{agent.name}</span>
                <i className={hasAgent(agent.id) ? 'switch is-on' : 'switch'} aria-label={hasAgent(agent.id) ? 'Accessible' : 'Retiré'}><b /></i>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
