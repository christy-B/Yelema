import { Check, MoreHorizontal, Plus, Search, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents, listMetiers } from '../../../shared/api/agent/api'
import type { AgentSummary, Metier } from '../../../shared/api/agent/contracts'
import { addMember, listCapabilities, listMembers } from '../../../shared/api/members/api'
import type { CapabilityDefinition, Member } from '../../../shared/api/members/contracts'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { Button } from '../../../shared/components/button/button'
import { Filter } from '../../../shared/components/filter/filter'
import { Input } from '../../../shared/components/input/input'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

export function MembersPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [members, setMembers] = useState<Member[]>([])
  const [capabilities, setCapabilities] = useState<CapabilityDefinition[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [metiers, setMetiers] = useState<Metier[]>([])
  const [query, setQuery] = useState('')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteCaps, setInviteCaps] = useState<string[]>([])
  const [inviteExcluded, setInviteExcluded] = useState<string[]>([])

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    void Promise.all([listMembers(), listCapabilities(), listAgents(), listMetiers()]).then(([memberItems, definitions, agentItems, metierItems]) => {
      setMembers(memberItems); setCapabilities(definitions); setAgents(agentItems); setMetiers(metierItems); setStatus('ready')
    }).catch(() => setStatus('error'))
  }, [retryKey])

  const filtered = useMemo(() => members.filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(query.toLowerCase())), [members, query])
  const totalAgents = agents.length || 10

  const capsLabel = (member: Member) => {
    if (member.status === 'pending') return { label: 'En attente', cls: 'is-pending' }
    if (member.capabilities.length === capabilities.length && capabilities.length > 0) return { label: 'Toutes les capacités', cls: 'is-all' }
    const n = member.capabilities.length
    return { label: `${n} capacité${n > 1 ? 's' : ''}`, cls: '' }
  }
  const agentsLabel = (member: Member) => {
    if (member.status === 'pending') return '—'
    const access = totalAgents - member.excludedAgentIds.length
    return access >= totalAgents ? 'Tous les agents' : `${access} agents`
  }

  const openInvite = () => { setEmail(''); setInviteCaps([]); setInviteExcluded([]); setInviteOpen(true) }
  const toggleCap = (key: string) => setInviteCaps((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key])
  const allCapsOn = capabilities.length > 0 && inviteCaps.length === capabilities.length
  const toggleAllCaps = () => setInviteCaps(allCapsOn ? [] : capabilities.map((capability) => capability.key))
  const agentOn = (id: string) => !inviteExcluded.includes(id)
  const toggleAgent = (id: string) => setInviteExcluded((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const allAgentsOn = inviteExcluded.length === 0
  const toggleAllAgents = () => setInviteExcluded(allAgentsOn ? agents.map((agent) => agent.id) : [])
  const removeMetier = (metierId: string) => {
    if (!metierId) return
    const ids = metiers.find((item) => item.id === metierId)?.agentIds ?? []
    setInviteExcluded((items) => Array.from(new Set([...items, ...ids])))
  }

  const invite = async (event: React.FormEvent) => {
    event.preventDefault()
    const created = await addMember({ email, capabilities: inviteCaps, excludedAgentIds: inviteExcluded })
    setMembers((items) => [...items, created]); setInviteOpen(false)
  }

  return (
    <>
      <PageHeader title="Membres" subtitle="Gérez les accès et les capacités au sein de votre workspace." />
      <PageBody>
        <div className="files-toolbar">
          <Input className="list-search" aria-label="Rechercher un membre" placeholder="Rechercher un membre…" value={query} onChange={(event) => setQuery(event.target.value)} icon={<Search size={17} />} />
          <button type="button" className="files-import" onClick={openInvite}><Plus size={17} /> Ajouter un membre</button>
        </div>

        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}
        {status !== 'error' && <div className="members-table">
          <div className="members-head"><span /><span>Membre</span><span>Capacités</span><span>Agents accessibles</span><span /></div>
          {filtered.map((member) => {
            const caps = capsLabel(member)
            return (
              <button type="button" key={member.id} className="members-row" onClick={() => navigate(paths.member(member.id, workspaceId))}>
                <span className={member.status === 'pending' ? 'member-avatar is-pending' : 'member-avatar'} style={member.status === 'pending' ? undefined : { background: member.color }}>{member.status === 'pending' ? <UserRound size={17} /> : member.initials}</span>
                <span className="member-id"><strong>{member.name}</strong><small>{member.email}</small></span>
                <span><span className={`caps-badge ${caps.cls}`}>{caps.label}</span></span>
                <span className="member-agents">{agentsLabel(member)}</span>
                <span className="member-more"><MoreHorizontal size={18} /></span>
              </button>
            )
          })}
        </div>}
      </PageBody>

      {inviteOpen && (
        <div className="modal-overlay" onClick={() => setInviteOpen(false)}>
          <form className="modal-card modal-card--lg" onClick={(event) => event.stopPropagation()} onSubmit={invite}>
            <div className="modal-head"><h2>Ajouter un membre</h2><button type="button" className="modal-close" onClick={() => setInviteOpen(false)} aria-label="Fermer"><X size={18} /></button></div>
            <p className="modal-intro">Le membre recevra un e-mail pour définir son mot de passe et accéder au workspace. L'adresse doit appartenir au domaine plan.gouv.ci.</p>

            <Input label="Adresse e-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="prenom.nom@plan.gouv.ci" required autoFocus />

            <div className="modal-field">
              <div className="modal-field-head"><span>Capacités <em>· ce que le membre pourra faire</em></span><button type="button" className="link-button" onClick={toggleAllCaps}>{allCapsOn ? 'Tout décocher' : 'Tout cocher'}</button></div>
              <div className="modal-list">
                {capabilities.map((capability) => {
                  const on = inviteCaps.includes(capability.key)
                  return (
                    <button type="button" key={capability.key} className="modal-check-row" onClick={() => toggleCap(capability.key)}>
                      <span className={on ? 'check-box is-on' : 'check-box'}>{on && <Check size={12} />}</span>
                      <span>{capability.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="modal-field">
              <div className="modal-field-head"><span>Agents accessibles <em>· par défaut tous ; décochez pour retirer</em></span></div>
              <div className="modal-agent-bulk">
                <button type="button" className={allAgentsOn ? 'bulk-chip is-on' : 'bulk-chip'} onClick={toggleAllAgents}>{allAgentsOn ? 'Tout retirer' : 'Tous les agents'}</button>
                <Filter label="Retirer les agents d'un métier" value="" onChange={removeMetier} options={[{ value: '', label: "Retirer les agents d'un métier…" }, ...metiers.map((metier) => ({ value: metier.id, label: metier.name }))]} />
              </div>
              <div className="modal-list modal-list--scroll">
                {agents.map((agent) => (
                  <button type="button" key={agent.id} className="modal-agent-row" onClick={() => toggleAgent(agent.id)}>
                    <span className="agent-icon"><AgentIcon name={agent.icon} size={16} /></span>
                    <span className="modal-agent-name">{agent.name}</span>
                    <i className={agentOn(agent.id) ? 'switch is-on' : 'switch'} aria-label={agentOn(agent.id) ? 'Accessible' : 'Retiré'}><b /></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <Button type="button" variant="tertiary" onClick={() => setInviteOpen(false)}>Annuler</Button>
              <Button type="submit" leadingIcon={<Plus size={17} />}>Ajouter le membre</Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
