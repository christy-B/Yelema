import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import logo from '../../../assets/brand/logo-lockup-dark.png'
import { requestPasswordReset } from '../../../shared/api/auth/api'
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
  const [value, setValue] = useState(mode === 'forgot' ? 'a.kone@plan.gouv.ci' : '')
  const [sent, setSent] = useState(false)
  const content = copy[mode]

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (mode === 'forgot') await requestPasswordReset(value)
    setSent(true)
  }

  return (
    <main className="simple-auth-page">
      <form className="simple-auth-card" onSubmit={submit}>
        <img src={logo} alt="Yelema" />
        <h1>{sent ? 'Demande enregistrée' : content.title}</h1>
        <p>{sent ? 'Consultez votre boîte e-mail pour poursuivre.' : content.text}</p>
        {!sent && <Input id="credential" label={mode === 'forgot' ? 'Adresse e-mail' : 'Nouveau mot de passe'} type={mode === 'forgot' ? 'email' : 'password'} value={value} onChange={(event) => setValue(event.target.value)} required />}
        {!sent && <Button type="submit" size="large" trailingIcon={<ArrowRight size={18} />}>{content.button}</Button>}
        <button className="back-link" type="button" onClick={() => navigate(paths.login)}><ArrowLeft size={17} /> Retour à la connexion</button>
      </form>
    </main>
  )
}
