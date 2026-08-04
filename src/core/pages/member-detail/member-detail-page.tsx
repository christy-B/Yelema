import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents, listMetiers } from '../../../features/agents/api/api'
import type { AgentSummary, Metier } from '../../../features/agents/api/contracts'
import { getMember, listRoles, setMemberExcludedAgents, setMemberRole } from '../../../features/members/api/api'
import type { Member, RoleDefinition } from '../../../features/members/api/contracts'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { Button } from '../../../shared/components/button/button'
import { Card } from '../../../shared/components/card/card'
import { Filter } from '../../../shared/components/filter/filter'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { can } from '../../../features/auth/api/permissions'
import { useSession } from '../../../features/auth/providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

export function MemberDetailPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID, memberId = '' } = useParams()
  const { session } = useSession()
  const canEdit = can(session, 'members', 'edit')
  const [member, setMember] = useState<Member | null>(null)
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [metiers, setMetiers] = useState<Metier[]>([])

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    // tenant-roles·view peut être refusé indépendamment de members·view.
    void Promise.all([getMember(memberId), listRoles().catch((): RoleDefinition[] => []), listAgents(), listMetiers()]).then(([m, roleItems, agentItems, metierItems]) => {
      setMember(m); setRoles(roleItems); setAgents(agentItems); setMetiers(metierItems); setStatus('ready')
    }).catch(() => setStatus('error'))
  }, [memberId, retryKey])

  if (status === 'error') return <div className="member-detail-page"><LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} /></div>
  if (!member) return <div className="route-loader">Chargement du membre…</div>

  const hasAgent = (id: string) => !member.excludedAgentIds.includes(id)

  const run = async (action: () => Promise<Member>) => {
    setActionError('')
    try {
      setMember(await action())
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'La modification a échoué.')
    }
  }
  const selectRole = (key: string) => run(() => setMemberRole(member.id, key))
  const toggleAgent = (id: string) => {
    const next = member.excludedAgentIds.includes(id) ? member.excludedAgentIds.filter((item) => item !== id) : [...member.excludedAgentIds, id]
    return run(() => setMemberExcludedAgents(member.id, next))
  }
  const removeMetier = (metierId: string) => {
    if (!metierId) return
    const ids = metiers.find((item) => item.id === metierId)?.agentIds ?? []
    const next = Array.from(new Set([...member.excludedAgentIds, ...ids]))
    void run(() => setMemberExcludedAgents(member.id, next))
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
        <div>
          <h1>{member.name} {member.status === 'pending' && <span className="caps-badge is-pending">En attente</span>}</h1>
          <p>{member.status === 'pending' ? `Invitation envoyée à ${member.email} — les accès configurés s'appliqueront à l'activation.` : member.email}</p>
        </div>
      </div>

      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      <div className="member-detail-grid">
        <Card>
          <div className="settings-head"><h2>Rôle</h2></div>
          <p className="settings-hint">Le rôle détermine ce que ce membre peut consulter ou modifier.</p>
          {roles.map((role) => {
            const active = member.role?.key === role.key
            return (
              <button type="button" className="setting-toggle" key={role.key} disabled={!canEdit} onClick={() => void selectRole(role.key)}>
                <span><strong>{role.name}</strong>{role.description && <small>{role.description}</small>}</span>
                <i className={active ? 'switch is-on' : 'switch'} aria-label={active ? 'Rôle attribué' : 'Attribuer ce rôle'}><b /></i>
              </button>
            )
          })}
        </Card>

        <Card>
          <div className="settings-head"><h2>Experts IA accessibles</h2><span>{accessCount} / {agents.length}</span></div>
          <p className="settings-hint">Par défaut, accès à tous les experts IA. Décochez pour retirer.</p>
          {canEdit && <Filter label="Retirer les experts IA d'un métier" value="" onChange={(value) => removeMetier(value)} options={[{ value: '', label: "Retirer les experts IA d'un métier…" }, ...metiers.map((metier) => ({ value: metier.id, label: metier.name }))]} />}
          <div className="member-agent-list">
            {agents.map((agent) => (
              <button type="button" className="setting-toggle" key={agent.id} disabled={!canEdit} onClick={() => void toggleAgent(agent.id)}>
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
