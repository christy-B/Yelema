import { Check, MoreHorizontal, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents, listMarketplaceAgents, listMetiers } from '../../../features/agents/api/api'
import type { AgentSummary, Metier } from '../../../features/agents/api/contracts'
import { addMember, deleteMember, listMembers } from '../../../features/members/api/api'
import { CAPABILITY_LABELS, MEMBER_PERMISSIONS, permissionKey } from '../../../features/members/api/contracts'
import type { Member } from '../../../features/members/api/contracts'
import { Button } from '../../../shared/components/button/button'
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
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
  const canEdit = can(session, 'members', 'edit')
  const [members, setMembers] = useState<Member[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [metiers, setMetiers] = useState<Metier[]>([])
  const [query, setQuery] = useState('')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [invitePerms, setInvitePerms] = useState<string[]>([])
  const [inviteExcluded, setInviteExcluded] = useState<string[]>([])
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)

  const [menuId, setMenuId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    // Le registre des rôles n'est plus chargé : l'écran attribue des
    // permissions, le rôle n'est qu'un raccourci côté serveur.
    // Tous les experts, equipe ET catalogue : accorder un acces ne se limite
    // pas a ce que le membre connecte peut lui-meme voir.
    void Promise.all([listMembers(), listAgents(), listMarketplaceAgents().catch(() => []), listMetiers()])
      .then(([memberItems, teamItems, catalogueItems, metierItems]) => {
        const tous = [...teamItems, ...catalogueItems]
          .filter((agent, index, all) => all.findIndex((other) => other.id === agent.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        setMembers(memberItems); setAgents(tous); setMetiers(metierItems); setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [retryKey])

  const filtered = useMemo(() => members.filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(query.toLowerCase())), [members, query])
  const totalAgents = agents.length || 10

  /**
   * Ce que le membre peut faire, en clair. On lit les permissions de son rôle
   * plutôt que le nom du rôle : « Facturation · Experts IA » renseigne, alors
   * que « Administrateur » oblige à connaître la grille par cœur.
   */
  const permissionsOf = (member: Member): string => {
    if (member.status === 'pending') return 'En attente'
    if (member.permissions.length === 0) return 'Aucune permission'
    return Object.keys(CAPABILITY_LABELS)
      .filter((capability) => member.permissions.some((entry) => entry.capability === capability))
      .map((capability) => CAPABILITY_LABELS[capability])
      .join(' · ')
  }
  const agentsLabel = (member: Member) => {
    if (member.status === 'pending') return '—'
    // On annonce le nombre reel : « tous les experts » laissait croire a un
    // catalogue entier alors que l'equipe n'en compte que quelques-uns.
    const access = totalAgents - member.excludedAgentIds.length
    return `${access} expert${access > 1 ? 's' : ''} IA sur ${totalAgents}`
  }

  // Aucun rôle présélectionné : le choix est explicite (moindre privilège).
  const openInvite = () => { setEmail(''); setInvitePerms([]); setInviteExcluded([]); setInviteError(''); setInviteOpen(true) }
  const allAgentsOn = inviteExcluded.length === 0
  const toggleAllAgents = () => setInviteExcluded(allAgentsOn ? agents.map((agent) => agent.id) : [])
  /**
   * Rendre l'acces aux experts d'un metier. « Tout retirer » existe deja : ce
   * qui manquait, c'etait de pouvoir remonter metier par metier apres avoir
   * fait table rase.
   */
  const agentOn = (id: string) => !inviteExcluded.includes(id)
  const toggleAgent = (id: string) => setInviteExcluded((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])

  const addMetier = (metierId: string) => {
    if (!metierId) return
    const ids = metiers.find((item) => item.id === metierId)?.agentIds ?? []
    setInviteExcluded((items) => items.filter((id) => !ids.includes(id)))
  }

  const invite = async (event: React.FormEvent) => {
    event.preventDefault()
    setInviting(true)
    setInviteError('')
    try {
      const created = await addMember({ email, permissionKeys: invitePerms, excludedAgentIds: inviteExcluded })
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
          {canCreate && <Button leadingIcon={<Plus size={17} />} onClick={openInvite}>Ajouter un membre</Button>}
        </div>

        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}
        {status !== 'error' && <div className="members-table">
          <div className="members-head"><span /><span>Membre</span><span>Permissions</span><span>Experts IA accessibles</span><span /></div>
          {filtered.map((member) => {
            const permissions = permissionsOf(member)
            return (
              <div key={member.id} className="members-row" role="link" tabIndex={0} onClick={() => navigate(paths.member(member.id, workspaceId))} onKeyDown={(event) => { if (event.key === 'Enter') navigate(paths.member(member.id, workspaceId)) }}>
                <span className={member.status === 'pending' ? 'member-avatar is-pending' : 'member-avatar'} style={member.status === 'pending' ? undefined : { background: member.color }}>{member.status === 'pending' ? <UserRound size={17} /> : member.initials}</span>
                <span className="member-id"><strong>{member.name}</strong><small>{member.email}</small></span>
                <span className="member-perms">{permissions}</span>
                <span className="member-agents">{agentsLabel(member)}</span>
                <div className="file-actions" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  {(canEdit || canDelete) && <button type="button" aria-label="Plus d'actions" onClick={() => setMenuId(menuId === member.id ? null : member.id)}><MoreHorizontal size={18} /></button>}
                  {menuId === member.id && (
                    <div className="row-menu">
                      {canEdit && <button type="button" className="row-menu-edit" onClick={() => { setMenuId(null); navigate(paths.member(member.id, workspaceId)) }}><Pencil size={15} /> Modifier</button>}
                      {canDelete && <button type="button" className="row-menu-danger" onClick={() => { setMenuId(null); setMemberToRemove(member) }}><Trash2 size={15} /> Retirer</button>}
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
          <form className="modal-card modal-card--lg member-modal" onClick={(event) => event.stopPropagation()} onSubmit={invite}>
            <div className="modal-head"><h2>Ajouter un membre</h2><button type="button" className="modal-close" onClick={() => setInviteOpen(false)} aria-label="Fermer"><X size={18} /></button></div>
            <p className="modal-intro">Il recevra un lien pour définir son mot de passe.</p>

            <Input label="Adresse e-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={domain ? `prenom.nom@${domain}` : 'prenom.nom@organisation.ci'} required autoFocus />

            <div className="modal-field">
              <div className="modal-field-head"><span>Permissions <em>· ce que le membre pourra faire</em></span></div>
              {/* Des permissions, pas des roles : un client ne raisonne pas en
                  « proprietaire / administrateur », il dit « celui-la peut voir
                  la facturation, pas inviter des gens ». */}
              <div className="modal-list">
                {MEMBER_PERMISSIONS.map((option) => {
                  const key = permissionKey(option.capability, option.action)
                  const on = invitePerms.includes(key)
                  return (
                    <button
                      type="button"
                      key={key}
                      role="checkbox"
                      aria-checked={on}
                      className="modal-check-row"
                      onClick={() => setInvitePerms((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])}
                    >
                      <span className={on ? 'check-box is-on' : 'check-box'}>{on && <Check size={12} />}</span>
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="modal-field">
              <div className="modal-field-head"><span>Experts IA accessibles <em>· {agents.length} au catalogue ; décochez pour retirer</em></span></div>
              <div className="modal-agent-bulk">
                <button type="button" className={allAgentsOn ? 'bulk-chip is-on' : 'bulk-chip'} onClick={toggleAllAgents}>{allAgentsOn ? 'Tout retirer' : 'Tout ajouter'}</button>
                <Filter label="Ajouter par métier" value="" onChange={addMetier} options={[{ value: '', label: 'Ajouter par métier…' }, ...metiers.map((metier) => ({ value: metier.id, label: metier.name }))]} />
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
              <Button type="submit" disabled={inviting || invitePerms.length === 0} leadingIcon={<Plus size={17} />}>{inviting ? 'Envoi…' : 'Ajouter le membre'}</Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
