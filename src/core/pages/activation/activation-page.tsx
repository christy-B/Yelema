import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import logo from '../../../assets/brand/logo-lockup-dark.png'
import { activateAccount, getActivation } from '../../../shared/api/auth/api'
import type { ActivationLookupResponse } from '../../../shared/api/auth/contracts'
import { Button } from '../../../shared/components/button/button'
import { Input } from '../../../shared/components/input/input'
import { paths } from '../../routes/paths'

export function ActivationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [invitation, setInvitation] = useState<ActivationLookupResponse | null>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(Boolean(token))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(token ? '' : 'Le lien d’activation ne contient aucun token.')

  useEffect(() => {
    if (!token) return
    void getActivation(token)
      .then(setInvitation)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Lien d’activation invalide.'))
      .finally(() => setLoading(false))
  }, [token])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await activateAccount(token, password)
      navigate(paths.login, { replace: true, state: { email: invitation?.email, accountActivated: true } })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Activation impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="simple-auth-page activation-page">
      <form className="simple-auth-card activation-card" onSubmit={submit}>
        <img src={logo} alt="Yelema" />
        <h1>Activez votre compte</h1>
        {loading && <p>Vérification de votre invitation…</p>}
        {!loading && invitation && (
          <>
            <p>Bienvenue {invitation.name}. Définissez votre mot de passe pour rejoindre votre organisation.</p>
            <Input id="activation-email" label="Adresse e-mail" value={invitation.email} disabled />
            <Input id="activation-password" label="Mot de passe" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            <Input id="activation-confirmation" label="Confirmer le mot de passe" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required />
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" size="large" disabled={submitting} leadingIcon={<CheckCircle2 size={18} />} trailingIcon={<ArrowRight size={18} />}>{submitting ? 'Activation…' : 'Activer mon compte'}</Button>
          </>
        )}
        {!loading && !invitation && <p className="form-error" role="alert">{error}</p>}
      </form>
    </main>
  )
}
