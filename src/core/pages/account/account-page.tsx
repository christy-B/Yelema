import { useEffect, useState } from 'react'

import { getAccount, updateAccount, updatePreferences } from '../../../shared/api/account/api'
import type { Account } from '../../../shared/api/account/contracts'
import { Button } from '../../../shared/components/button/button'
import { Card } from '../../../shared/components/card/card'
import { Input } from '../../../shared/components/input/input'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'
import { useSession } from '../../providers/session-context'

export function AccountPage() {
  const { refreshSession } = useSession()
  const [account, setAccount] = useState<Account | null>(null)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  useEffect(() => {
    void getAccount().then(setAccount).catch(() => setError(true))
  }, [retryKey])
  if (error) return <><PageHeader title="Paramètres du compte" subtitle="Votre profil, votre sécurité et vos préférences." /><PageBody><LoadError onRetry={() => { setError(false); setRetryKey((key) => key + 1) }} /></PageBody></>
  if (!account) return <div className="route-loader">Chargement du compte…</div>
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setAccount(await updateAccount({ name: account.name, title: account.title, language: account.language }))
    // Le nom/fonction sont aussi affichés dans la sidebar (session) — on la resynchronise.
    await refreshSession()
  }
  const toggle = async (key: 'twoFactorEnabled' | 'notificationsEnabled') => setAccount(await updatePreferences({ twoFactorEnabled: key === 'twoFactorEnabled' ? !account.twoFactorEnabled : account.twoFactorEnabled, notificationsEnabled: key === 'notificationsEnabled' ? !account.notificationsEnabled : account.notificationsEnabled }))
  return <><PageHeader title="Paramètres du compte" subtitle="Votre profil, votre sécurité et vos préférences." /><PageBody><form className="settings-column" onSubmit={save}><Card><h2>Profil</h2><div className="settings-grid"><Input label="Nom complet" value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} /><Input label="Fonction" value={account.title} onChange={(event) => setAccount({ ...account, title: event.target.value })} /><Input label="Adresse e-mail" value={account.email} disabled /><label className="field"><span className="field-label">Langue</span><span className="input-shell"><select value={account.language} onChange={(event) => setAccount({ ...account, language: event.target.value })}><option value="fr">Français</option><option value="en">English</option></select></span></label></div><Button type="submit">Enregistrer</Button></Card><Card><h2>Préférences</h2><button type="button" className="setting-toggle" onClick={() => void toggle('notificationsEnabled')}><span><strong>Notifications</strong><small>Recevoir les alertes importantes.</small></span><i className={account.notificationsEnabled ? 'switch is-on' : 'switch'}><b /></i></button><button type="button" className="setting-toggle" onClick={() => void toggle('twoFactorEnabled')}><span><strong>Double authentification</strong><small>Renforcer la sécurité de votre compte.</small></span><i className={account.twoFactorEnabled ? 'switch is-on' : 'switch'}><b /></i></button></Card></form></PageBody></>
}
