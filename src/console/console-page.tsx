import { Building2, Check, Copy, Inbox, Mail, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { clearMessages, createUser, getMessages, getOverview, updateWorkspace } from './api'
import type { ConsoleOverview, DemoMessage } from './api'

/**
 * Console de démonstration — ce que fera le control-plane.
 *
 * Ni un écran client ni une fonctionnalité du produit : une paillasse. Elle
 * crée les comptes et relève les messages que la plateforme aurait envoyés,
 * pour qu'on puisse dérouler le parcours réel — inviter, recevoir le lien,
 * activer, arriver dans l'onboarding — sans back ni serveur de courriel.
 *
 * Elle n'apparaît dans aucune navigation : on y accède en tapant /console.
 */
export function ConsolePage() {
  const [overview, setOverview] = useState<ConsoleOverview | null>(null)
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roleKey, setRoleKey] = useState('member')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')

  // Rechargement piloté par un compteur : les actions le font avancer, l'effet
  // relit. Les états ne sont posés que dans la continuation de la promesse.
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((count) => count + 1), [])

  useEffect(() => {
    let current = true
    void Promise.all([getOverview(), getMessages()])
      .then(([state, inbox]) => { if (!current) return; setOverview(state); setMessages(inbox) })
      .catch(() => { if (current) setError('La console n’a pas pu charger son état.') })
    return () => { current = false }
  }, [reload])

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await createUser({ name: name.trim(), email: email.trim(), roleKey })
      setName('')
      setEmail('')
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Création impossible.')
    } finally {
      setBusy(false)
    }
  }

  const copy = (link: string) => {
    void navigator.clipboard?.writeText(`${window.location.origin}${link}`)
    setCopied(link)
    window.setTimeout(() => setCopied(''), 1600)
  }

  if (!overview) {
    return <div className="cns-shell"><p className="cns-empty">{error || 'Chargement de la console…'}</p></div>
  }

  return (
    <div className="cns-shell">
      <header className="cns-head">
        <h1>Console de démonstration</h1>
        <p>
          Ce que fera le control-plane : créer l’organisation, ouvrir les accès, envoyer les liens.
          Cet écran ne fait pas partie de l’espace client et n’est lié depuis aucune navigation.
        </p>
      </header>

      <section className="cns-card">
        <h2><Building2 size={16} aria-hidden="true" />L’organisation</h2>
        <div className="cns-row">
          <label>
            <span>Nom</span>
            <input
              value={overview.workspace.name}
              onChange={(event) => setOverview({ ...overview, workspace: { ...overview.workspace, name: event.target.value } })}
              onBlur={(event) => { void updateWorkspace({ name: event.target.value }).then(refresh).catch(() => setError('Renommage refusé.')) }}
            />
          </label>
          <label>
            <span>Forfait</span>
            <select
              value={overview.workspace.plan?.key ?? ''}
              onChange={(event) => { void updateWorkspace({ planKey: event.target.value }).then(refresh).catch(() => setError('Forfait refusé.')) }}
            >
              {overview.plans.map((plan) => <option key={plan.key} value={plan.key}>{plan.name} — {plan.seats} accès</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="cns-card">
        <h2><UserPlus size={16} aria-hidden="true" />Ouvrir un accès</h2>
        <div className="cns-row">
          <label><span>Nom</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Aminata Diarra" /></label>
          <label><span>Adresse e-mail</span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="a.diarra@banque-atlantique.ci" /></label>
          <label>
            <span>Rôle</span>
            <select value={roleKey} onChange={(event) => setRoleKey(event.target.value)}>
              {overview.roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
            </select>
          </label>
          <button type="button" className="cns-primary" onClick={() => void submit()} disabled={busy || !name.trim() || !email.trim()}>
            {busy ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
        {error && <p className="cns-error" role="alert">{error}</p>}

        <table className="cns-table">
          <thead><tr><th>Nom</th><th>Adresse</th><th>Rôle</th><th>État</th><th>Lien d’activation</th></tr></thead>
          <tbody>
            {overview.users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td className="cns-mono">{user.email}</td>
                <td>{overview.roles.find((role) => role.key === user.roleKey)?.name ?? user.roleKey}</td>
                <td><span className={user.status === 'active' ? 'cns-tag is-on' : 'cns-tag'}>{user.status === 'active' ? 'actif' : 'en attente'}</span></td>
                <td>
                  {user.activationLink
                    ? <span className="cns-linkcell">
                        <Link to={user.activationLink}>Ouvrir</Link>
                        <button type="button" onClick={() => copy(user.activationLink!)} aria-label="Copier le lien">
                          {copied === user.activationLink ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </span>
                    : <span className="cns-none">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cns-card">
        <h2>
          <Inbox size={16} aria-hidden="true" />Boîte de réception
          {messages.length > 0 && (
            <button type="button" className="cns-ghost" onClick={() => { void clearMessages().then(refresh) }}>
              <Trash2 size={13} aria-hidden="true" />Vider
            </button>
          )}
        </h2>
        <p className="cns-note">Les messages que la plateforme aurait envoyés. C’est ici qu’on relève le lien d’activation.</p>
        {messages.length === 0
          ? <p className="cns-empty">Aucun message. Créez un accès ci-dessus.</p>
          : <ul className="cns-mail">
              {messages.map((message) => (
                <li key={message.id}>
                  <div className="cns-mail-head">
                    <Mail size={14} aria-hidden="true" />
                    <b>{message.subject}</b>
                    <span className="cns-mono">à {message.to}</span>
                  </div>
                  <p>{message.body}</p>
                  <Link className="cns-mail-link" to={message.link}>Activer mon compte</Link>
                </li>
              ))}
            </ul>}
      </section>
    </div>
  )
}
