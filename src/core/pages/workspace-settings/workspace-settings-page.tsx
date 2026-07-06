import { useEffect, useState } from 'react'

import { getWorkspace, updateWorkspace } from '../../../shared/api/workspace/api'
import type { Workspace } from '../../../shared/api/workspace/contracts'
import { Button } from '../../../shared/components/button/button'
import { Card } from '../../../shared/components/card/card'
import { Input } from '../../../shared/components/input/input'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'

export function WorkspaceSettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  useEffect(() => {
    void getWorkspace().then(setWorkspace).catch(() => setError(true))
  }, [retryKey])
  if (error) return <><PageHeader title="Paramètres de l'organisation" subtitle="Identité, formule et règles d'accès." /><PageBody><LoadError onRetry={() => { setError(false); setRetryKey((key) => key + 1) }} /></PageBody></>
  if (!workspace) return <div className="route-loader">Chargement de l'organisation…</div>
  const save = async (event: React.FormEvent) => { event.preventDefault(); setWorkspace(await updateWorkspace(workspace)) }
  return <><PageHeader title="Paramètres de l'organisation" subtitle="Identité, formule et règles d'accès." /><PageBody><form className="settings-column" onSubmit={save}><Card><h2>Organisation</h2><div className="settings-grid"><Input label="Nom de l'organisation" value={workspace.name} onChange={(event) => setWorkspace({ ...workspace, name: event.target.value })} /><Input label="Domaine" value={workspace.domain} onChange={(event) => setWorkspace({ ...workspace, domain: event.target.value })} /><Input label="Formule" value={workspace.plan} disabled /><Input label="Nombre de places" value={workspace.seats} type="number" onChange={(event) => setWorkspace({ ...workspace, seats: Number(event.target.value) })} /></div><Button type="submit">Enregistrer</Button></Card><Card><button type="button" className="setting-toggle" onClick={() => setWorkspace({ ...workspace, restrictDomain: !workspace.restrictDomain })}><span><strong>Limiter les invitations au domaine {workspace.domain}</strong><small>Seules les adresses de ce domaine pourront être invitées.</small></span><i className={workspace.restrictDomain ? 'switch is-on' : 'switch'}><b /></i></button></Card></form></PageBody></>
}
