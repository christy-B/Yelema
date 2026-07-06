import { ArrowRight, Diamond, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import logo from '../../../assets/brand/logo-lockup-white.png'
import { login } from '../../../shared/api/auth/api'
import { listConversations } from '../../../shared/api/conversation/api'
import { Button } from '../../../shared/components/button/button'
import { Input } from '../../../shared/components/input/input'
import { useSession } from '../../providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { from?: string; email?: string; accountActivated?: boolean } | null
  const { refreshSession } = useSession()
  const [email, setEmail] = useState(locationState?.email ?? 'a.kone@plan.gouv.ci')
  const [password, setPassword] = useState('motdepasse')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login({ email, password })
      await refreshSession()
      // Onboarding = première connexion : les conversations sont privées, donc /conversations
      // ne renvoie que celles du membre connecté ; liste vide ⇒ premier usage.
      const mine = await listConversations()
      const destination = mine.length === 0
        ? paths.onboarding(DEFAULT_WORKSPACE_ID)
        : locationState?.from ?? paths.workspace(DEFAULT_WORKSPACE_ID)
      navigate(destination, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-frame">
        <section className="login-brand-panel">
          <img className="login-logo" src={logo} alt="Yelema" />
          <Diamond className="login-diamond login-diamond--small" aria-hidden="true" />
          <Diamond className="login-diamond login-diamond--medium" aria-hidden="true" />
          <Diamond className="login-diamond login-diamond--large" aria-hidden="true" />
          <div className="login-brand-copy"><h1>l'IA pour<br />l'Afrique.</h1><p>Des agents IA prêts à l'emploi pour accompagner vos équipes dans leurs tâches métier au quotidien.</p></div>
          <p className="login-security"><LockKeyhole aria-hidden="true" size={15} /> <span>Espace sécurisé · accès réservé aux<br />organisations clientes</span></p>
        </section>
        <section className="login-form-panel">
          <form className="login-form" onSubmit={submit} noValidate>
            <h2>Connexion à votre espace</h2>
            <p>Entrez vos identifiants pour accéder à vos<br />agents.</p>
            {locationState?.accountActivated && <p className="login-success" role="status">Votre compte est activé. Vous pouvez maintenant vous connecter.</p>}
            <Input id="email" label="Adresse e-mail" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input id="password" label="Mot de passe" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus action={<button className="input-action" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>} />
            <button className="forgot-link" type="button" onClick={() => navigate(paths.forgotPassword)}>Mot de passe oublié ?</button>
            <div className="login-feedback" aria-live="polite">{error && <p className="form-error" role="alert">{error}</p>}</div>
            <Button size="large" type="submit" disabled={loading} aria-busy={loading} trailingIcon={<ArrowRight aria-hidden="true" size={19} />}>{loading ? 'Connexion…' : 'Se connecter'}</Button>
            <p className="login-help">Besoin d'un accès ? Contactez l'administrateur de<br />votre organisation.</p>
          </form>
        </section>
      </div>
    </main>
  )
}
