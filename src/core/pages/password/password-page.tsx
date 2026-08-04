import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import logo from '../../../assets/brand/yelema_logo_final_long.svg'
import { requestPasswordReset, resetPassword } from '../../../features/auth/api/api'
import { Button } from '../../../shared/components/button/button'
import { Input } from '../../../shared/components/input/input'
import { paths } from '../../routes/paths'

const copy = {
  activation: { title: 'Activez votre compte', text: 'Définissez votre mot de passe pour rejoindre votre organisation.', button: 'Activer mon compte' },
  forgot: { title: 'Mot de passe oublié', text: 'Indiquez votre adresse e-mail. Nous vous enverrons un lien de réinitialisation.', button: 'Envoyer le lien' },
  reset: { title: 'Nouveau mot de passe', text: 'Choisissez un mot de passe sécurisé pour votre compte.', button: 'Enregistrer' },
}

export function PasswordPage({ mode }: { mode: keyof typeof copy }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [value, setValue] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const content = copy[mode]

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(value)
        setSent(true)
      } else {
        if (!token) {
          setError('Le lien de réinitialisation est invalide : aucun token trouvé.')
          return
        }
        await resetPassword(token, value)
        navigate(paths.login, { replace: true, state: { passwordReset: true } })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La demande a échoué. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="simple-auth-page">
      <form className="simple-auth-card" onSubmit={submit}>
        <img src={logo} alt="Yelema" />
        <h1>{sent ? 'Demande enregistrée' : content.title}</h1>
        <p>{sent ? 'Consultez votre boîte e-mail pour poursuivre.' : content.text}</p>
        {!sent && <Input id="credential" label={mode === 'forgot' ? 'Adresse e-mail' : 'Nouveau mot de passe'} type={mode === 'forgot' ? 'email' : 'password'} autoComplete={mode === 'forgot' ? 'email' : 'new-password'} value={value} onChange={(event) => setValue(event.target.value)} minLength={mode === 'forgot' ? undefined : 8} required />}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!sent && <Button type="submit" size="large" disabled={submitting} trailingIcon={<ArrowRight size={18} />}>{submitting ? 'Envoi…' : content.button}</Button>}
        <button className="back-link" type="button" onClick={() => navigate(paths.login)}><ArrowLeft size={17} /> Retour à la connexion</button>
      </form>
    </main>
  )
}
