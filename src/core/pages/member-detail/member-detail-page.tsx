import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { getMember, setMemberPermissions } from '../../../features/members/api/api'
import { MEMBER_PERMISSIONS, permissionKey, type Member } from '../../../features/members/api/contracts'
import { Button } from '../../../shared/components/button/button'
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
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [actionError, setActionError] = useState('')
  /**
   * Permissions en cours de modification. Tant qu'elle vaut `null`, l'ecran
   * affiche ce que le serveur a renvoye ; des qu'on coche, on travaille sur ce
   * brouillon jusqu'a l'enregistrement.
   */
  const [draft, setDraft] = useState<string[] | null>(null)

  useEffect(() => {
    void getMember(memberId)
      .then((loaded) => { setMember(loaded); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [memberId, retryKey])

  if (status === 'error') {
    return <div className="member-detail-page"><LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} /></div>
  }
  if (!member) return <div className="route-loader">Chargement du membre…</div>

  // Le serveur regroupe les actions par capacité : on remet à plat en paires
  // « capacité:action », la forme que les cases manipulent.
  const granted = new Set(
    member.permissions.flatMap((entry) => entry.actions.map((action) => permissionKey(entry.capability, action))),
  )

  const run = async (action: () => Promise<Member>) => {
    setActionError('')
    try {
      setMember(await action())
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'La modification a échoué.')
    }
  }

  const chosen = draft ?? [...granted]
  const dirty = draft !== null && (draft.length !== granted.size || draft.some((key) => !granted.has(key)))
  const togglePermission = (key: string) => {
    setDraft(chosen.includes(key) ? chosen.filter((entry) => entry !== key) : [...chosen, key])
  }
  const savePermissions = async () => {
    await run(() => setMemberPermissions(member.id, chosen))
    setDraft(null)
  }

  return (
    <div className="member-detail-page">
      <div className="agent-detail-breadcrumb">
        <Button variant="tertiary" size="small" leadingIcon={<ArrowLeft size={16} />} onClick={() => navigate(paths.members(workspaceId))}>Membres</Button>
        <span className="breadcrumb">
          <button type="button" onClick={() => navigate(paths.members(workspaceId))}>Membres</button>
          <ChevronRight size={15} />
          <strong>{member.name}</strong>
        </span>
      </div>

      <div className="member-detail-head">
        <span className="member-avatar member-avatar--xl" style={{ background: member.color }}>{member.initials}</span>
        <div>
          <h1>
            {member.name}
            {member.status === 'pending' && <span className="caps-badge is-pending">En attente</span>}
          </h1>
          <p>{member.email}</p>
        </div>
      </div>

      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      <section className="mb-block">
        <div className="mb-head"><h2>Permissions</h2></div>
        <div className="mb-perms">
          {MEMBER_PERMISSIONS.map((permission) => {
            const key = permissionKey(permission.capability, permission.action)
            return (
              <label key={key} className="mb-perm">
                <input
                  type="checkbox"
                  checked={chosen.includes(key)}
                  disabled={!canEdit}
                  onChange={() => togglePermission(key)}
                />
                <span>{permission.label}</span>
              </label>
            )
          })}
        </div>
        {/* On coche, on decoche, puis on enregistre : rien ne part au clic. */}
        {canEdit && (
          <div className="mb-save">
            <Button size="small" variant="tertiary" disabled={!dirty} onClick={() => setDraft(null)}>Annuler</Button>
            <Button size="small" disabled={!dirty} onClick={() => void savePermissions()}>Enregistrer</Button>
          </div>
        )}
      </section>

    </div>
  )
}
