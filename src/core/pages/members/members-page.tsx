import { Check, MoreHorizontal, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents, listMetiers } from '../../../features/agents/api/api'
import type { AgentSummary, Metier } from '../../../features/agents/api/contracts'
import { addMember, deleteMember, listMembers, listRoles } from '../../../features/members/api/api'
import type { Member, RoleDefinition } from '../../../features/members/api/contracts'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { Button } from '../../../shared/components/button/button'
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog'
import { Filter } from '../../../shared/components/filter/filter'
import { Input } from '../../../shared/components/input/input'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'
import { can } from '../../../features/auth/api/permissions'
import { useSession } from '../../../features/auth/providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

export function MembersPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const { session } = useSession()
  const domain = session?.workspace.domain ?? ''
  const canCreate = can(session, 'members', 'create')
  const canDelete = can(session, 'members', 'delete')
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [metiers, setMetiers] = useState<Metier[]>([])
  const [query, setQuery] = useState('')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviteExcluded, setInviteExcluded] = useState<string[]>([])
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)

  const [menuId, setMenuId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    // Le registre des rôles exige tenant-roles·view : s'il est refusé, la page
    // reste utilisable (les rôles ne servent qu'à la modale d'invitation).
    void Promise.all([listMembers(), listRoles().catch((): RoleDefinition[] => []), listAgents(), listMetiers()]).then(([memberItems, roleItems, agentItems, metierItems]) => {
      setMembers(memberItems); setRoles(roleItems); setAgents(agentItems); setMetiers(metierItems); setStatus('ready')
    }).catch(() => setStatus('error'))
  }, [retryKey])

  const filtered = useMemo(() => members.filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(query.toLowerCase())), [members, query])
  const totalAgents = agents.length || 10

  const roleLabel = (member: Member) => {
    if (member.status === 'pending') return { label: 'En attente', cls: 'is-pending' }
    return { label: member.role?.name ?? 'Aucun rôle', cls: '' }
  }
  const agentsLabel = (member: Member) => {
    if (member.status === 'pending') return '—'
    const access = totalAgents - member.excludedAgentIds.length
    return access >= totalAgents ? 'Tous les experts IA' : `${access} expert${access > 1 ? 's' : ''} IA`
  }

  // Aucun rôle présélectionné : le choix est explicite (moindre privilège).
  const openInvite = () => { setEmail(''); setInviteRole(''); setInviteExcluded([]); setInviteError(''); setInviteOpen(true) }
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
    setInviting(true)
    setInviteError('')
    try {
      const created = await addMember({ email, roleKey: inviteRole || undefined, excludedAgentIds: inviteExcluded })
      setMembers((items) => [...items, created]); setInviteOpen(false)
    } catch (reason) {
      setInviteError(reason instanceof Error ? reason.message : 'Invitation impossible.')
    } finally {
      setInviting(false)
    }
  }

  const remove = async () => {
    if (!memberToRemove) return
    await deleteMember(memberToRemove.id)
    setMembers((items) => items.filter((item) => item.id !== memberToRemove.id))
    setMemberToRemove(null)
  }

  return (
    <>
      <PageHeader title="Membres" subtitle="Gérez les accès et les rôles au sein de votre workspace." />
      <PageBody>
        <div className="files-toolbar">
          <Input className="list-search" aria-label="Rechercher un membre" placeholder="Rechercher un membre…" value={query} onChange={(event) => setQuery(event.target.value)} icon={<Search size={17} />} />
          {canCreate && <button type="button" className="files-import" onClick={openInvite}><Plus size={17} /> Ajouter un membre</button>}
        </div>

        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}
        {status !== 'error' && <div className="members-table">
          <div className="members-head"><span /><span>Membre</span><span>Rôle</span><span>Experts IA accessibles</span><span /></div>
          {filtered.map((member) => {
            const role = roleLabel(member)
            return (
              <div key={member.id} className="members-row" role="link" tabIndex={0} onClick={() => navigate(paths.member(member.id, workspaceId))} onKeyDown={(event) => { if (event.key === 'Enter') navigate(paths.member(member.id, workspaceId)) }}>
                <span className={member.status === 'pending' ? 'member-avatar is-pending' : 'member-avatar'} style={member.status === 'pending' ? undefined : { background: member.color }}>{member.status === 'pending' ? <UserRound size={17} /> : member.initials}</span>
                <span className="member-id"><strong>{member.name}</strong><small>{member.email}</small></span>
                <span><span className={`caps-badge ${role.cls}`}>{role.label}</span></span>
                <span className="member-agents">{agentsLabel(member)}</span>
                <div className="file-actions" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  {canDelete && <button type="button" aria-label="Plus d'actions" onClick={() => setMenuId(menuId === member.id ? null : member.id)}><MoreHorizontal size={18} /></button>}
                  {canDelete && menuId === member.id && (
                    <div className="row-menu">
                      <button type="button" className="row-menu-danger" onClick={() => { setMenuId(null); setMemberToRemove(member) }}><Trash2 size={15} /> Retirer le membre</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>}
      </PageBody>

      {memberToRemove && (
        <ConfirmDialog
          title="Retirer ce membre ?"
          message={`${memberToRemove.name} perdra l'accès au workspace. Ses conversations restent conservées.`}
          confirmLabel="Retirer le membre"
          onConfirm={() => void remove()}
          onCancel={() => setMemberToRemove(null)}
        />
      )}

      {inviteOpen && (
        <div className="modal-overlay" onClick={() => setInviteOpen(false)}>
          <form className="modal-card modal-card--lg" onClick={(event) => event.stopPropagation()} onSubmit={invite}>
            <div className="modal-head"><h2>Ajouter un membre</h2><button type="button" className="modal-close" onClick={() => setInviteOpen(false)} aria-label="Fermer"><X size={18} /></button></div>
            <p className="modal-intro">Le membre recevra un e-mail pour définir son mot de passe et accéder au workspace.</p>

            <Input label="Adresse e-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={domain ? `prenom.nom@${domain}` : 'prenom.nom@organisation.ci'} required autoFocus />

            <div className="modal-field">
              <div className="modal-field-head"><span>Rôle <em>· ce que le membre pourra faire</em></span></div>
              <div className="modal-list">
                {roles.map((role) => {
                  const on = inviteRole === role.key
                  return (
                    <button type="button" key={role.key} className="modal-check-row" onClick={() => setInviteRole(role.key)}>
                      <span className={on ? 'check-box is-on' : 'check-box'}>{on && <Check size={12} />}</span>
                      <span>{role.name}{role.description ? <em className="modal-role-hint"> · {role.description}</em> : null}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="modal-field">
              <div className="modal-field-head"><span>Experts IA accessibles <em>· par défaut tous ; décochez pour retirer</em></span></div>
              <div className="modal-agent-bulk">
                <button type="button" className={allAgentsOn ? 'bulk-chip is-on' : 'bulk-chip'} onClick={toggleAllAgents}>{allAgentsOn ? 'Tout retirer' : 'Tous les experts IA'}</button>
                <Filter label="Retirer les experts IA d'un métier" value="" onChange={removeMetier} options={[{ value: '', label: "Retirer les experts IA d'un métier…" }, ...metiers.map((metier) => ({ value: metier.id, label: metier.name }))]} />
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

            {inviteError && <p className="form-error" role="alert">{inviteError}</p>}
            <div className="modal-actions">
              <Button type="button" variant="tertiary" onClick={() => setInviteOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={inviting || (roles.length > 0 && !inviteRole)} leadingIcon={<Plus size={17} />}>{inviting ? 'Envoi…' : 'Ajouter le membre'}</Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
